const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongoose = require('mongoose');

// load user model
require('../models/User');
const User = mongoose.model('users');

// load secrets
const secrets = require('../config/secrets');

const expTime = (20 * 60);
module.exports.expTime = expTime;

// signs jwt with given user id
module.exports.signJWT = id => {
	return jwt.sign({id: id, exp: Math.floor(Date.now() / 1000) + expTime}, secrets.authSecret);
}

module.exports.checkToken = () => {
	return (req, res, next) => {
		if(!req.headers.authorization) {
			return next();
		}
		jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
			if (err) return next();

			User.findOne({ _id: decodedAuthToken.id })
				.then((user) => {
					if (!user) {
						return next();
					}
					if ((decodedAuthToken.exp - expTime) * 1000 < user.lastModified) {
						return next();
					}
					res.locals.token = jwt.sign({id: user.id, exp: Math.floor(Date.now() / 1000) + expTime}, secrets.authSecret);
					next();
				})
				.catch((err) => {
					throw err;
				});
		});
	}
}