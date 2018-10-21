const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create festival schema
const FestivalSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	//###
	title: {
		type: String
	},
	//###
	url: {
		type: String
	},
	description: {
		type: String
	},
	genre: {
		type: [String],
		required: true
	},
	events: {
		type: [String]
	},
	address: {
		default: {
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
				type: String
			},
			countryCode: {
				type: String,
				required: true
			}
		},
		international: {
			street: {
				type: String
			},
			city: {
				type: [String]
			},
			country: {
				type: [String]
			}
		}, //###
		//###
		street: {
			type: String
		},
		administrative: {
			type: String
		},
		city: {
			type: String
		},
		county: {
			type: String
		},
		country: {
			type: String
		},
		postcode: {
			type: String
		},
		lat: {
			type: Number
		},
		lng: {
			type: Number
		},
		value: {
			type: String
		}
		//###
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
mongoose.model('unvalidated_festivals', FestivalSchema);