"use strict";

var binaryUtil = {};

// int -> binary string
binaryUtil.decimalToBinary = function (value) {
	return (value >>> 0).toString(2);
};

binaryUtil.decimalToBinaryPadded = function (value, padLen) {
	var binary = binaryUtil.decimalToBinary(value);
	var len = binary.length
	if (len < padLen) {
		for (var i = 0; i < padLen - len; i++) {
			binary = "0" + binary;
		}
	}

	return binary;
}

binaryUtil.stringToByteStrings = function (input) {
	return input.match(/.{1,8}/g);
}

binaryUtil.byteStringChecksum = function (byteStringArray) {
	return byteStringArray
	.map(function (n) {
		return n.split("").reverse().join("");
	})
	.map(function (n) {
		return parseInt(n, 2);
	})
	.reduce(function (acc, n) {
		return acc + n;
	}, 0) % 256;
}

binaryUtil.inverseBinaryString = function (input) {
	return input.split("")
	.map(function(c) {
		return c === "0" ? "1" : "0"
	})
	.join("");
};

module.exports = binaryUtil;
