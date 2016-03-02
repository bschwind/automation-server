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
	var code = "1000000000001000000000000000001011111101111111110000000000110011110011000100100110110110";

	// Button category
	switch (state.button) {
		case "UP/DOWN":
			code += "0010001011011101";
			break;
		case "MODE":
			code += "1100100000110111";
			break;
		case "FAN_SPEED":
			code += "0100001010111101";
			break;
		case "FAN_DIRECTION":
			code += "1000000101111110";
			break;
		default:
			code += "1100100000110111"; // MODE
			break;
	}

	// Temperature code
	var temperatureCode = binaryUtil.decimalToBinary(state.temperature);
	temperatureCode = temperatureCode.split("").reverse().join("");
	temperatureCode = "00" + temperatureCode + "0";
	temperatureCode += binaryUtil.inverseBinaryString(temperatureCode);

	code += temperatureCode;

	// Timer-specific code
	code += "00000000111111110000000011111111000000001111111100000000111111110000000011111111";

	// Mode
	var modeFanString = "";
	switch (state.mode) {
		case "HEAT":
			modeFanString += "0110";
			break;
		case "DEHUMIDIFY":
			modeFanString += "1010";
			break;
		case "COOL":
			modeFanString += "1100";
			break;
		default:
			modeFanString += "1010"; // Dehumidify
			break;
	}

	// Fan speed
	switch (state.fan_speed) {
		case "AUTO":
			modeFanString += "1010";
			break;
		case "STRONG":
			modeFanString += "0010";
			break;
		case "WEAK":
			modeFanString += "1100";
			break;
		case "VERY_WEAK":
			modeFanString += "0100";
			break;
		default:
			modeFanString += "1010"; // AUTO
			break;
	}

	code += modeFanString;
	code += binaryUtil.inverseBinaryString(modeFanString);

	if (state.power_status === "ON") {
		code += "100010110111010000000000111111110000000011111111";
	} else {
		code += "100000110111110000000000111111110000000011111111";
	}

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
			program: "aircon",
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
