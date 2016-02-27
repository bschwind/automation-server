"use strict";

var db = require("db");

var lightController = {};

function getIRCode() {
	return "01000001101101100101100010100111";
}

lightController.toggleState = function (req, res) {
	console.log(getIRCode());
	
	var data = {};

	data.message_code = 1;
	data.message = "OK";

	res.status(200).json(data);
};

module.exports = lightController;
