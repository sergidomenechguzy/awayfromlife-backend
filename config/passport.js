const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;

// load user model
require('../models/User');
const User = mongoose.model('users');

//load secrets
const secrets = require('../config/secrets');

//load tokens
const token = require('../config/token');

const jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = secrets.authSecret;

// authenticates user with authentication-token
module.exports = function (passport) {
	passport.use(new JwtStrategy(jwtOptions, (jwt_payload, next) => {
			
		User.findOne({ _id: jwt_payload.id })
			.then((user) => {
				if (!user) {
					return next(null, false);
				}
				if ((jwt_payload.exp - token.expTime) * 1000 < user.lastModified) {
					return next(null, false);
				}
				return next(null, user);
			})
			.catch((err) => {
				throw err;
			});
	}));
};