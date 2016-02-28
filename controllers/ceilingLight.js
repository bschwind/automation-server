"use strict";

var db = require("db");
var irslinger = require("services/irslinger");

var lightController = {};

function getIRCode() {
	return "01000001101101100101100010100111";
}

lightController.toggleState = function (req, res) {
	irslinger.sling({
		program: "ceiling-light",
		code: getIRCode() // Technically this isn't needed since the code is static
	});
	
	var data = {};

	data.message_code = 1;
	data.message = "OK";

	res.status(200).json(data);
};

module.exports = lightController;
