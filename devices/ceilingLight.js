"use strict";

var sqs = require("services/sqs");
var irslinger = require("services/irslinger");

var ceilingLight = {};

ceilingLight.toggle = function () {
	irslinger.sling({
		program: "ceiling-light",
		code: "01000001101101100101100010100111"
	});
};

sqs.on("ceiling_light", function (data) {
	ceilingLight.toggle();
});

module.exports = ceilingLight;
