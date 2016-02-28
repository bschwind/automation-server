"use strict";

var db = require("db");
var moment = require("moment");
var Promise = require("bluebird");
var irslinger = require("services/irslinger");
var validation = require("services/validation");

var airController = {};

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

function getLatestState() {
	return Promise.resolve(latestState);
}

function setNewState(state) {
	var irCode = getIRCodeFromState(state);

	irslinger.sling({
		program: "aircon",
		code: irCode
	});

	delete state["button"];
	delete state["id"];

	state.time_sent = moment().unix();

	db("air_con_history")
	.insert(state)
	.then(function (newID) {});

	latestState = state;

	return state;
}

// int -> string
function decimalToBinary(value) {
	return (value >>> 0).toString(2);
}

function inverseBinaryString(input) {
	return input.split("")
	.map(function(c) {
		return c === "0" ? "1" : "0"
	})
	.join("");
}

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
	var temperatureCode = decimalToBinary(state.temperature);
	temperatureCode = temperatureCode.split("").reverse().join("");
	temperatureCode = "00" + temperatureCode + "0";
	temperatureCode += inverseBinaryString(temperatureCode);

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
	code += inverseBinaryString(modeFanString);

	if (state.power_status === "ON") {
		code += "100010110111010000000000111111110000000011111111";
	} else {
		code += "100000110111110000000000111111110000000011111111";
	}

	return code;
};

airController.getState = function (req, res) {
	var data = {};

	getLatestState()
	.then(function (state) {
		data.message_code = 1;
		data.message = "OK";
		data.result = state;
		res.status(200).json(data);
	});
};

airController.setMode = function (req, res) {
	var data = {};

	validation.run(req, {
		mode: [validation.required, validation.isOneOf(["HEAT", "DEHUMIDIFY", "COOL"])]
	})
	.then(function (fields) {
		return getLatestState()
		.then(function (state) {
			state.mode = fields.mode;
			state.button = "MODE";

			return setNewState(state);
		});
	})
	.then(function (newState) {
		data.message_code = 1;
		data.message = "OK";
		data.result = newState;
		res.status(200).json(data);
	})
	.catch(validation.ValidationError, function (err) {
		data.message_code = 2;
		data.message = "Invalid data";
		data.errors = err.messages;
		res.status(400).json(data);
	});
};

airController.setTemperature = function (req, res) {
	var data = {};

	validation.run(req, {
		temperature: [validation.required, validation.minVal(16), validation.maxVal(27)]
	})
	.then(function (fields) {
		return getLatestState()
		.then(function (state) {
			state.temperature = Number(fields.temperature);
			state.button = "UP/DOWN";

			return setNewState(state);
		});
	})
	.then(function (newState) {
		data.message_code = 1;
		data.message = "OK";
		data.result = newState;
		res.status(200).json(data);
	})
	.catch(validation.ValidationError, function (err) {
		data.message_code = 2;
		data.message = "Invalid data";
		data.errors = err.messages;
		res.status(400).json(data);
	});
};

airController.setFanSpeed = function (req, res) {
	var data = {};

	validation.run(req, {
		fan_speed: [validation.required, validation.isOneOf(["AUTO", "STRONG", "WEAK", "VERY_WEAK"])]
	})
	.then(function (fields) {
		return getLatestState()
		.then(function (state) {
			state.fan_speed = fields.fan_speed;
			state.button = "FAN_SPEED";

			return setNewState(state);
		});
	})
	.then(function (newState) {
		data.message_code = 1;
		data.message = "OK";
		data.result = newState;
		res.status(200).json(data);
	})
	.catch(validation.ValidationError, function (err) {
		data.message_code = 2;
		data.message = "Invalid data";
		data.errors = err.messages;
		res.status(400).json(data);
	});
};

airController.toggleFanDirection = function (req, res) {
	var data = {};

	return getLatestState()
	.then(function (state) {
		state.button = "FAN_DIRECTION";

		return setNewState(state);
	})
	.then(function (newState) {
		data.message_code = 1;
		data.message = "OK";
		data.result = newState;
		res.status(200).json(data);
	})
	.catch(validation.ValidationError, function (err) {
		data.message_code = 2;
		data.message = "Invalid data";
		data.errors = err.messages;
		res.status(400).json(data);
	});
};

airController.setPowerStatus = function (req, res) {
	var data = {};

	validation.run(req, {
		power_status: [validation.required, validation.isOneOf(["ON", "OFF"])]
	})
	.then(function (fields) {
		return getLatestState()
		.then(function (state) {
			state.power_status = fields.power_status;
			state.button = "MODE";

			return setNewState(state);
		});
	})
	.then(function (newState) {
		data.message_code = 1;
		data.message = "OK";
		data.result = newState;
		res.status(200).json(data);
	})
	.catch(validation.ValidationError, function (err) {
		data.message_code = 2;
		data.message = "Invalid data";
		data.errors = err.messages;
		res.status(400).json(data);
	});
};

module.exports = airController;
