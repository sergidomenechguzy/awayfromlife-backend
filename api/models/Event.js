const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const EventSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	url: {
		type: String,
		trim: true
	},
	description: {
		type: String,
		trim: true
	},
	location: {
		type: String,
		required: true
	},
	date: {
		type: Date,
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
		default: 0,
		min: 0,
		max: 2
	},
	ticketLink: {
		type: String,
		trim: true
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