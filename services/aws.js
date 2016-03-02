"use strict";

// Convenience module to return an AWS instance already
// configured with our access keys
var AWS = require("aws-sdk");

var accessKeyId = process.env.AWS_KEY;
var secretAccessKey = process.env.AWS_SECRET;
var region = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region
});

module.exports = AWS;
