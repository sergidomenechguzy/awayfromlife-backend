const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create festival schema
const FestivalSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	url: {
		type: String
	},
	description: {
		type: String
	},
	events: {
		type: [String]
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
	ticketLink: {
		type: String
	},
	website: {
		type: String
	},
	facebookUrl: {
		type: String
	}
});

mongoose.model('festivals', FestivalSchema);