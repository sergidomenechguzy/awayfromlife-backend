const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const EventSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

mongoose.model('events', EventSchema);