const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const ReportSchema = new Schema({
	category: {
		type: String,
		required: true
	},
	item: {
		type: String,
		required: true
	},
	description: {
		type: String
	}
});

mongoose.model('reports', ReportSchema);