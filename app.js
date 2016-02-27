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

// Create app
var app = express();

// Set up middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up routes

// Air Conditioner
app.get("/api/v1/aircon", airController.getState);
app.post("/api/v1/aircon/mode", airController.setMode);
app.post("/api/v1/aircon/temperature", airController.setTemperature);
app.post("/api/v1/aircon/fanspeed", airController.setFanSpeed);
app.post("/api/v1/aircon/fandirection", airController.toggleFanDirection);
app.post("/api/v1/aircon/power", airController.setPowerStatus);

// Ceiling Light
app.post("/api/v1/ceilinglight/toggle", lightController.toggleState);

// Start the server
var server = app.listen(8888, function () {
    console.log("Automation server started");
    console.log("Listening on port %d", server.address().port);
});
