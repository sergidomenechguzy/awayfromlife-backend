const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create band schema
const BandSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	url: {
		type: String
	},
	genre: {
		type: [String],
		required: true
	},
	origin: {
		default: {
			city: {
				type: String,
				required: true
			},
			administrative: {
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
			},
			countryCode: {
				type: String,
				required: true
			}
		},
		international: {
			city: {
				type: [String]
			},
			country: {
				type: [String]
			}
		},//###
		//###
		name: {
			type: String
		},
		city: {
			type: String
		},
		administrative: {
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
			type: String,
		}
		//###
	},
	history: {
		type: String
	},
	recordLabel: {
		type: String
	},
	releases: [{
		releaseName: {
			type: String
		},
		releaseYear: {
			type: String
		}
	}],
	foundingDate: {
		type: String
	},
	website: {
		type: String
	},
	//###
	websiteUrl: {
		type: String
	},
	//###
	bandcampUrl: {
		type: String
	},
	soundcloudUrl: {
		type: String
	},
	facebookUrl: {
		type: String
	}
});

mongoose.model('bands', BandSchema);
mongoose.model('unvalidated_bands', BandSchema);