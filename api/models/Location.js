const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create location schema
const LocationSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	url: {
		type: String
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
	},
	image: {
		type: [String]
	}
});

mongoose.model('locations', LocationSchema);
mongoose.model('unvalidated_locations', LocationSchema);