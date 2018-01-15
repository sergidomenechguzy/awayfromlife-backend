const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const EventSchema = new Schema({
	title: {
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
	endDate: {
		type: String
	},
	time: {
		type: String
	},
	bands: {
		type: [String]
	}
});

mongoose.model('events', EventSchema);
mongoose.model('unvalidated_events', EventSchema);