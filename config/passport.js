const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;

// load user model
require('../models/User');
const User = mongoose.model('users');

const jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = 'superSecretSecret';

module.exports = function (passport) {
  passport.use(new JwtStrategy(jwtOptions, (jwt_payload, next) => {
    User.findOne({ _id: jwt_payload.id })
      .then(user => {
        if (!user) {
          next(null, false);
        }
        next(null, user);
      })
      .catch((err) => {
        throw err;
      });
  }));
};