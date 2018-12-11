const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create feedback schema
const FeedbackSchema = new Schema({
	text: {
		type: String,
		required: true
	},
	email: {
		type: String
	}
});

mongoose.model('feedback', FeedbackSchema);