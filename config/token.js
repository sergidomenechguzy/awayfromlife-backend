const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongoose = require('mongoose');

// load user model
require('../models/User');
const User = mongoose.model('users');

// load secrets
const secrets = require('../config/secrets');

const expireTime = 1200000;

// signs jwt with given user id
module.exports.signJWT = id => {
	return jwt.sign({id: id, expire: Date.now() + expireTime}, secrets.authSecret);
}

module.exports.checkToken = () => {
	return (req, res, next) => {
		if(!req.headers.authorization) {
			return next();
		}
		jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
			if (err) return next();

			if (decodedAuthToken.expire < Date.now()) {
				return next();
			}
			else {
				User.findOne({ _id: decodedAuthToken.id })
					.then((user) => {
						if (!user) {
							return next();
						}
						if ((decodedAuthToken.expire - expireTime) < user.lastModified) {
							return next();
						}
						res.locals.token = jwt.sign({id: user.id, expire: Date.now() + expireTime}, secrets.authSecret);
						next();
					})
					.catch((err) => {
						throw err;
					});
			}
		});
	}
}