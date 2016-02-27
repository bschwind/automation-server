"use strict";

var db = require("knex")({
	client: "sqlite3",
	connection: {
		filename: "./automation.db"
	}
});

module.exports = db;
