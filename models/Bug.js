const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const BugSchema = new Schema({
  error: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  login: {
    type: Number,
    required: true
  }
});

mongoose.model('bugs', BugSchema);