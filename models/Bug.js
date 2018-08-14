const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create bug schema
const BugSchema = new Schema({
	error: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	loggedIn: {
		type: Number
	},
	component: {
		type: String
	},
	email: {
		type: String
	}
});

mongoose.model('bugs', BugSchema);