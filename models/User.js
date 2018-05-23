const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create user schema
const UserSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	currentSessions: [{
			sessionID: {
				type: String
			},
			expireTime: {
				type: Number
			}
		}]
	
});

mongoose.model('users', UserSchema);