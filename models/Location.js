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
  information: {
    type: String
  },
  facebook_page_url: {
    type: String
  }
});

mongoose.model('locations', LocationSchema);