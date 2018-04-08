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
		type: Object
	},
	history: {
		type: String
	},
	label: {
		type: String
	},
	releases: {
		type: [String]
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