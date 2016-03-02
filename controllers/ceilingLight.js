"use strict";

var db = require("db");
var ceilingLight = require("devices/ceilingLight");

var lightController = {};

lightController.toggleState = function (req, res) {
	ceilingLight.toggle();
	
	var data = {};

	data.message_code = 1;
	data.message = "OK";

	res.status(200).json(data);
};

module.exports = lightController;
