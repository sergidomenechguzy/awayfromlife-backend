const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create user schema
const BandSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	genre: {
		type: String,
		required: true
	},
	origin: {
		name: {
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
		}
	},
	history: {
		type: String
	},
	label: {
		type: String
	},
	releases: {
		releaseName: {
			type: String
		},
		releaseYear: {
			type: String
		}
	},
	foundingDate: {
		type: String
	},
	websiteUrl: {
		type: String
	},
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