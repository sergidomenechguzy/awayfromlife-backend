const mongoose = require('mongoose');

const { Schema } = mongoose;

// create user schema
const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  currentSessions: [
    {
      sessionID: {
        type: String,
      },
      expireTime: {
        type: Number,
      },
    },
  ],
});

mongoose.model('users', UserSchema);
