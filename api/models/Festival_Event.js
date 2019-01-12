const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create festival-event schema
const FestivalEventSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	startDate: {
		type: Date,
		required: true
	},
	endDate: {
		type: Date,
		required: true
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
	verifiable: {
		type: Boolean,
		default: false
	}
});

mongoose.model('festival_events', FestivalEventSchema);
mongoose.model('unvalidated_festival_events', FestivalEventSchema);