const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create location schema
const LocationSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  status: {
	type: String,
	default: 'opened'
  },
  city: {
	type: String
  },
  country: {
	type: String
  },
  email: {
	  type: String
  },
  information: {
    type: String
  },
  website: {
	  type: String
  },
  facebook_page_url: {
    type: String
  }
});

mongoose.model('locations', LocationSchema);