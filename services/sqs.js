"use strict";

var AWS = require("services/aws");
var events = require("events");
var Promise = require("bluebird");

var queueName = "ir_commands";

var emitter = new events.EventEmitter();

// Create an instance of our SQS Client.
var sqs = new AWS.SQS();

function tryParseMessage(data) {
    try {
        if (typeof(data) === "object") {
            return data;
        } else {
            return JSON.parse(data);
        }
    } catch (err) {
        return false;
    }
}

function receive(queueUrl) {
    sqs.receiveMessage({ 
        QueueUrl: queueUrl,
        WaitTimeSeconds: 20
    }, function (err, data) {
        var timeoutRetry = 1;
        var shouldRetry = true;

        if (err) {
            console.error("SQS receive error");
            console.error(err);

            if (err.code === "UnknownEndpoint") {
                // Back off on calling the queue again if we encounter this error
                timeoutRetry = 2000;
            }

            if (!err.retryable) {
                shouldRetry = false;
            }
        }

        if (data && data.Messages) {
            data.Messages.forEach(function (message) {
                var body = message.Body;
                var parsedMsg = tryParseMessage(body);

                if (parsedMsg && parsedMsg.device && parsedMsg.data && parsedMsg.password === "your password here!") {
                    emitter.emit(parsedMsg.device, parsedMsg.data);
                }

                // Delete message from queue if we processed it or if it's a test message
                if (message.ReceiptHandle) {
                    sqs.deleteMessage({
                        QueueUrl: queueUrl,
                        ReceiptHandle: message.ReceiptHandle
                    }, function (err, data) {
                        if (err) {
                            console.error("SQS message deletion error");
                            console.error(err);
                        }
                    });
                }
            });
        }

        if (shouldRetry) {
            setTimeout(function () {
                receive(queueUrl);
            }, timeoutRetry);
        } else {
            // TODO - send an SNS message or email a server engineer
        }
    });
}

sqs.getQueueUrl({
    QueueName: queueName
}, function (err, data) {
    if (err) {
        console.error(err);
    } else {
        // This gets called repeatedly
        receive(data.QueueUrl);
    }
});

module.exports = emitter;
