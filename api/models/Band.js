const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create band schema
const BandSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	url: {
		type: String,
		trim: true
	},
	genre: {
		type: [String],
		required: true
	},
	origin: {
		default: {
			city: {
				type: String,
				required: true,
				trim: true
			},
			administrative: {
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
			city: {
				type: [String]
			},
			country: {
				type: [String]
			}
		}
	},
	history: {
		type: String,
		trim: true
	},
	recordLabel: {
		type: String,
		trim: true
	},
	releases: [{
		releaseName: {
			type: String,
			trim: true
		},
		releaseYear: {
			type: String,
			trim: true
		}
	}],
	foundingDate: {
		type: String,
		trim: true
	},
	website: {
		type: String,
		trim: true
	},
	bandcampUrl: {
		type: String,
		trim: true
	},
	soundcloudUrl: {
		type: String,
		trim: true
	},
	facebookUrl: {
		type: String,
		trim: true
	},
	image: {
		type: [String]
	},
	imageSource: {
		type: String,
		trim: true
	},
	lastModified: {
		type: Number,
		default: Date.now()
	}
});

mongoose.model('bands', BandSchema);
mongoose.model('unvalidated_bands', BandSchema);