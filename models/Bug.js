const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create event schema
const BugSchema = new Schema({
  function: {
    type: String
  },
  description: {
    type: String
  },
  loggedIn: {
    type: Number
  },
  component: {
    type: String
  }
});

mongoose.model('bugs', BugSchema);