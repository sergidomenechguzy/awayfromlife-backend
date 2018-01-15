const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const BugSchema = new Schema({
	function: {
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