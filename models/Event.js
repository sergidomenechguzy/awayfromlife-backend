const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const EventSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	url: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	location: {
		type: String,
		required: true
	},
	startDate: {
		type: String,
		required: true
	},
	bands: {
		type: [String]
	},
	canceled: {
		type: Number,
		default: 0
	},
	ticketLink: {
		type: String
	},
	lastModified: {
		type: Number,
		default: Date.now()
	}
});

mongoose.model('events', EventSchema);
mongoose.model('unvalidated_events', EventSchema);
mongoose.model('archived_events', EventSchema);