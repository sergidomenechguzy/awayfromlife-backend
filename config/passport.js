const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;

// load user model
require('../models/User');
const User = mongoose.model('users');

//load secrets
const secrets = require('./secrets.js');

const jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = secrets.authSecret;

module.exports = function (passport) {
  passport.use(new JwtStrategy(jwtOptions, (jwt_payload, next) => {
    if (jwt_payload.expire < Date.now()) {
      next(null, false);
    }
    else {
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
    }
  }));
};