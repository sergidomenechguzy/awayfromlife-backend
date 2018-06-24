const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create location schema
const LocationSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	address: {
		street: {
			type: String,
			required: true
		},
		administrative: {
			type: String
		},
		city: {
			type: String,
			required: true
		},
		county: {
			type: String
		},
		country: {
			type: String,
			required: true
		},
		postcode: {
			type: String
		},
		lat: {
			type: Number,
			required: true
		},
		lng: {
			type: Number,
			required: true
		},
		value: {
			type: String,
		}
	},
	status: {
		type: String,
		default: 'opened'
	},
	information: {
		type: String
	},
	website: {
		type: String
	},
	facebookUrl: {
		type: String
	}
});

mongoose.model('locations', LocationSchema);
mongoose.model('unvalidated_locations', LocationSchema);