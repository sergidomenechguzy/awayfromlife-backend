const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create festival-event schema
const FestivalEventSchema = new Schema({
	title: {
		type: String,
		required: true
	},
	startDate: {
		type: String,
		required: true
	},
	endDate: {
		type: String,
		required: true
	},
	bands: {
		type: [String],
		required: true
	},
	canceled: {
		type: Number,
		default: 0
	}
});

mongoose.model('festival_events', FestivalEventSchema);
mongoose.model('unvalidated_festival_events', FestivalEventSchema);