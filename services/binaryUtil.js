"use strict";

var binaryUtil = {};

// int -> binary string
binaryUtil.decimalToBinary = function (value) {
	return (value >>> 0).toString(2);
};

binaryUtil.inverseBinaryString = function (input) {
	return input.split("")
	.map(function(c) {
		return c === "0" ? "1" : "0"
	})
	.join("");
};

module.exports = binaryUtil;
