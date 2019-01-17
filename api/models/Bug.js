const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create bug schema
const BugSchema = new Schema({
	error: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		trim: true
	},
	loggedIn: {
		type: Number,
		min: 0,
		max: 2
	},
	component: {
		type: String,
		trim: true
	},
	email: {
		type: String,
		trim: true
	}
});

mongoose.model('bugs', BugSchema);