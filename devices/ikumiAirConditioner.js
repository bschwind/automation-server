"use strict";

var binaryUtil = require("services/binaryUtil");
var db = require("db");
var irslinger = require("services/irslinger");
var moment = require("moment");
var sqs = require("services/sqs");
var validation = require("services/validation");

var airConditioner = {};

var latestState = {};

// This is nasty, but needed for performance. SQLite read/write
// performance on the Pi is terrible
db.select([
	"id",
	"time_sent",
	"mode",
	"temperature",
	"fan_speed",
	"power_status"
])
.from("air_con_history")
.orderBy("id", "DESC")
.limit(1)
.then(function (results) {
	latestState = results[0];
});

function getIRCodeFromState(state) {
	var code = "";

	code += "01000000"; // Frame 2 byte 1
	code += "00000100";
	code += "00000111";
	code += "00100000";
	code += "00000000";

	if (state.power_status === "ON") {
		code += "1";
	} else {
		code += "0";
	}

	// Mode
	switch (state.mode) {
		case "HEAT":
			code += "0010010";
			break;
		case "DEHUMIDIFY":
			code += "0010100";
			break;
		case "COOL":
			code += "0011100";
			break;
		case "AUTO":
			code += "0010000";
			break;
		default:
			code += "0010100"; // Dehumidify
			break;
	}

	// Temperature
	var temperatureCode = binaryUtil.decimalToBinaryPadded(state.temperature - 16, 4).split("").reverse().join("");
	temperatureCode = "0" + temperatureCode + "100";
	code += temperatureCode;

	code += "00000001"; // Frame 2 Byte 8

	// Fan up/down
	code += "1111"; // Auto

	// Fan speed
	switch (state.fan_speed) {
		case "AUTO":
			code += "0101";
			break;
		case "STRONG":
			code += "1110";
			break;
		case "WEAK":
			code += "0010";
			break;
		case "VERY_WEAK":
			code += "1100";
			break;
		default:
			code += "0101"; // AUTO
			break;
	}

	// Fan left/right
	code += "10110000"; // Frame 2 byte 9

	code += "00000000"; // Frame 2 byte 10
	code += "01110000";
	code += "00000111";
	code += "00000000"; // This one is sometimes "00000010"...
	code += "00000000";
	code += "01100001";
	code += "00000000";
	code += "00010000";


	var checksum = binaryUtil.byteStringChecksum(binaryUtil.stringToByteStrings(code));
	code += binaryUtil.decimalToBinaryPadded(checksum, 8).split("").reverse().join("");

	return code;
};

airConditioner.getState = function () {
	return latestState;
};

airConditioner.setState = function (newState) {
	return validation.runOnObject(newState, {
		mode: [validation.isOneOf(["HEAT", "DEHUMIDIFY", "COOL"])],
		temperature: [validation.minVal(16), validation.maxVal(27)],
		fan_speed: [validation.isOneOf(["AUTO", "STRONG", "WEAK", "VERY_WEAK"])],
		power_status: [validation.isOneOf(["ON", "OFF"])]
	})
	.then(function (fields){
		var state = {
			mode: fields.mode || latestState.mode,
			temperature: fields.temperature || latestState.temperature,
			fan_speed: fields.fan_speed || latestState.fan_speed,
			power_status: fields.power_status || latestState.power_status,
			button: fields.button || "MODE" // Necessary to generate the correct IR code
		};

		var irCode = getIRCodeFromState(state);

		irslinger.sling({
			program: "panasonic",
			code: irCode
		});

		delete state["button"];

		state.time_sent = moment().unix();

		db("air_con_history")
		.insert(state)
		.then(function (newID) {});

		latestState = state;

		return state;
	})
	.catch(validation.ValidationError, function (err) {
		console.error(err);
		console.error("State passed: " + JSON.stringify(newState));
	});
};

airConditioner.toggleFanDirection = function (powerStatus) {
	return airConditioner.setState({
		button: "FAN_DIRECTION"
	});
};

airConditioner.setPowerStatus = function (powerStatus) {
	return airConditioner.setState({
		power_status: powerStatus
	});
};

sqs.on("air_conditioner", function (data) {
	airConditioner.setState(data);
});

module.exports = airConditioner;
