const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create location schema
const LocationSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	url: {
		type: String,
		trim: true
	},
	address: {
		default: {
			street: {
				type: String,
				required: true,
				trim: true
			},
			administrative: {
				type: String,
				trim: true
			},
			city: {
				type: String,
				required: true,
				trim: true
			},
			county: {
				type: String,
				trim: true
			},
			country: {
				type: String,
				required: true,
				trim: true
			},
			postcode: {
				type: String,
				trim: true
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
				trim: true
			},
			countryCode: {
				type: String,
				required: true,
				trim: true
			}
		},
		international: {
			street: {
				type: String,
				trim: true
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
		default: 'opened',
		trim: true
	},
	information: {
		type: String,
		trim: true
	},
	website: {
		type: String,
		trim: true
	},
	facebookUrl: {
		type: String,
		trim: true
	},
	image: {
		type: [String]
	}
});

mongoose.model('locations', LocationSchema);
mongoose.model('unvalidated_locations', LocationSchema);