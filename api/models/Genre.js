const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create genre schema
const GenreSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	}
});

mongoose.model('genres', GenreSchema);