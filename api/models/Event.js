const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const EventSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	url: {
		type: String
	},
	description: {
		type: String
	},
	location: {
		type: String,
		required: true
	},
	date: {
		type: String,
		required: true
	},
	time: {
		type: String
	},
	bands: {
		type: [String],
		required: true
	},
	canceled: {
		type: Number,
		default: 0
	},
	ticketLink: {
		type: String
	},
	verifiable: {
		type: Boolean,
		default: false
	},
	lastModified: {
		type: Number,
		default: Date.now()
	},
	image: {
		type: [String]
	}
});

mongoose.model('events', EventSchema);
mongoose.model('unvalidated_events', EventSchema);
mongoose.model('archived_events', EventSchema);