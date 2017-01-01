"use strict";

var airConditioner = require("devices/ikumiAirConditioner");
var validation = require("services/validation");

var airController = {};

airController.getState = function (req, res) {
	var data = {};

	data.message_code = 1;
	data.message = "OK";
	data.result = airConditioner.getState();

	res.status(200).json(data);
};

airController.setState = function (req, res) {
	var data = {};

	validation.run(req, {
		mode: [validation.isOneOf(["HEAT", "DEHUMIDIFY", "COOL"])],
		temperature: [validation.minVal(16), validation.maxVal(27)],
		fan_speed: [validation.isOneOf(["AUTO", "STRONG", "WEAK", "VERY_WEAK"])],
		power_status: [validation.isOneOf(["ON", "OFF"])]
	})
	.then(function (fields) {
		return airConditioner.setState(fields);
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

	data.message_code = 1;
	data.message = "OK";
	data.result = airConditioner.toggleFanDirection();

	res.status(200).json(data);
};

module.exports = airController;
