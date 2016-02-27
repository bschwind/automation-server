"use strict";

var Promise = require("bluebird");
var Validator = require("validator");

var validation = {};

function ValidationError(messages) {
	this.messages = messages;
}
ValidationError.prototype = Object.create(Error.prototype);

validation.ValidationError = ValidationError;

function addError(fieldName, ruleBroken, currentErrors) {
	if (!currentErrors[fieldName]) {
		currentErrors[fieldName] = [];
	}

	currentErrors[fieldName].push(ruleBroken);
};

function findField(req, fieldName) {
	var value = (req.body && req.body[fieldName])
		|| (req.query && req.query[fieldName]);
	return value;
}

// required is just a marker function that we check the existence of
// when running validation
validation.required = function () {
	return function (fieldValue) {}
}

validation.isInt = function (fieldValue) {
	if (Validator.isInt(fieldValue)) {
		return true;
	} else {
		return "isInt";
	}
}

validation.minVal = function (min) {
	return function (fieldValue) {
		if (Validator.isInt(fieldValue, {min: min})) {
			return true;
		} else {
			return "minValue: " + min;
		}
	}   
};

validation.maxVal = function (max) {
	return function (fieldValue) {
		if (Validator.isInt(fieldValue, {max: max})) {
			return true;
		} else {
			return "maxValue: " + max;
		}
	}
};

validation.minLength = function (min) {
	return function (fieldValue) {
		if (Validator.isLength(fieldValue, min, null)) {
			return true;
		} else {
			return "minLength: " + min;
		}
	}   
};

validation.maxLength = function (max) {
	return function (fieldValue) {
		if (Validator.isLength(fieldValue, null, max)) {
			return true;
		} else {
			return "maxLength: " + max;
		}
	}
};

validation.minMaxLength = function (min, max) {
	return function (fieldValue) {
		if (Validator.isLength(fieldValue, min, max)) {
			return true;
		} else {
			return "minMaxLength: " + min + ", " + max;
		}
	}
};

validation.isOneOf = function (validInputs) {
	return function (fieldValue) {
		if (validInputs.indexOf(fieldValue) === -1) {
			return "isOneOf: " + validInputs.join(", ");
		} else {
			return true;
		}
	};
}

validation.isEmail = function (fieldValue) {
	if (Validator.isEmail(fieldValue)) {
		return true;
	} else {
		return "isEmail";
	}
}

validation.isLength = function (min, max) {
	return function (fieldValue) {
		if (Validator.isLength(fieldValue, min, max)) {
			return true;
		} else {
			return "length: min=" + min, ", max=" + max;
		}
	}   
};

validation.isAscii = function (fieldValue) {
	if (Validator.isAscii(fieldValue)) {
		return true;
	} else {
		return "isAscii";
	}
}

// Returns true if the fieldValue passes all validation functions
// false otherwise
function runValidationFunctions(validationFunctions, fieldValue) {
	return validationFunctions.filter(function (valFunc) {
		// Filter out the required function, we handle that explicitly
		return valFunc !== validation.required;
	})
	.map(function (valFunc) {
		return valFunc(fieldValue);
	})
	.filter(function (result) {
		return typeof(result) === "string";
	});
}

validation.run = function (req, fields) {
	return new Promise(function (resolve, reject) {
		var errors = {};
		var validFields = {};

		Object.keys(fields).forEach(function (fieldName) {
			var validationFunctions = fields[fieldName];
			var required = validationFunctions.indexOf(validation.required) >= 0;
			var fieldValue = findField(req, fieldName)

			if (required) {
				if (!fieldValue) {
					// Error, missing required field
					addError(fieldName, "required", errors);
					// errors.push(fieldName + " is a required field");
				} else {
					// Continue with validation
					var validationResults = runValidationFunctions(validationFunctions, fieldValue);

					// If we have error messages
					if (validationResults.length > 0) {
						validationResults.forEach(function (result) {
							addError(fieldName, result, errors);
						});
					} else {
						validFields[fieldName] = fieldValue;
					}
				}
			} else if (fieldValue) {
				// Continue with validation on optional field if present
				var validationResults = runValidationFunctions(validationFunctions, fieldValue);

				// If we have error messages
				if (validationResults.length > 0) {
					validationResults.forEach(function (result) {
						addError(fieldName, result, errors);
					});
				} else {
					validFields[fieldName] = fieldValue;
				}
			}
		});

		if (Object.keys(errors).length > 0) {
			reject(new ValidationError(errors));
		} else {
			resolve(validFields);
		}
	});
};

module.exports = validation;
