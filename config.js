'use strict';

function Config(){
	var config = undefined;

	try {
		config = require('./config.json');
	} catch (error){
		console.log('Unable to find config.json. Please create a new config from the example.');
		process.exit(1);
	}

	var requiredValues = [ 'digital_ocean', 'provider' ];

	for (var i = 0; i < requiredValues.length; i++){
		if (!config.hasOwnProperty(requiredValues[i])){
			console.log("The provided config is invalid. Please create a proper config from the example.");
			process.exit(1);
		}
	}

	return config;
}

module.exports = Config();
