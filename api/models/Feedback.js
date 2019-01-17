const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create feedback schema
const FeedbackSchema = new Schema({
	text: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		trim: true
	}
});

mongoose.model('feedback', FeedbackSchema);