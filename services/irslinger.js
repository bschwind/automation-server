"use strict";

var Promise = require("bluebird");
var childProcess = require("child_process");

var irSlinger = {};

var queue = [];
// We only want to be running one IR command at a time, yay single threading!
var commandRunning = false;

function commandPromise(command) {
	return new Promise(function (resolve, reject) {
	    childProcess.exec(command, function (err, stdout, stderr) {
	        if (err) {
	            reject(err);
	        } else {
	            resolve(stdout);
	        }
	    });
	});
}

function runCommands() {
	if (queue.length > 0 && !commandRunning) {
		commandRunning = true;
		var command = queue.shift();

		// This is probably pretty unsafe, YOLO
		commandPromise("sudo " + command.program + " " + command.code)
		.then(function (stdout) {
			commandRunning = false;
			// I dunno if this is better than just straight recursion,
			// but it might prevent blowing the stack
			setTimeout(runCommands, 1);
		})
		.catch(function (err) {
			commandRunning = false;
		});
	}
}

irSlinger.sling = function (command) {
	queue.push(command);

	// Remove "older" commands if the queue gets too big
	if (queue.length > 5) {
		queue.shift();
	}

	runCommands();
};

module.exports = irSlinger;
