"use strict";

// Setup base path for modules loading
require("app-module-path").addPath(__dirname);

// Modules
var express = require("express");

// Middlewares
var bodyParser = require("body-parser");

// Controllers
var airController = require("controllers/airController");
var lightController = require("controllers/ceilingLight");

// Services
var sqs = require("services/sqs");

// Create app
var app = express();

// Set up middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up routes

// Air Conditioner
app.get("/api/v1/aircon", airController.getState);
app.post("/api/v1/aircon", airController.setState);
app.post("/api/v1/aircon/fandirection", airController.toggleFanDirection);

// Ceiling Light
app.post("/api/v1/ceilinglight/toggle", lightController.toggleState);

// Start the server
var server = app.listen(7777, function () {
    console.log("Automation server started");
    console.log("Listening on port %d", server.address().port);
});
