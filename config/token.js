const jwt = require('jsonwebtoken');
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

module.exports.checkToken = (forbidden) => {
	return (req, res, next) => {
		if(!req.headers.authorization || req.headers.authorization.split(' ')[0] != 'JWT') {
			if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
			return next();
		}
		jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
			if (err) {
				if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
				return next();
			}

			User.findOne({ _id: decodedAuthToken.id })
				.then(user => {
					if (!user) {
						if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
						return next();
					}
					if (!user.validTokens.includes(req.headers.authorization.split(' ')[1])) {
						if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
						return next();
					}
					
					res.locals.token = jwt.sign({id: user.id, exp: Math.floor(Date.now() / 1000) + expTime}, secrets.authSecret);
					let newValidTokens = user.validTokens;
					if (!newValidTokens.includes(res.locals.token)) {
						if(newValidTokens.length === 10) newValidTokens.shift();
						newValidTokens.push(res.locals.token);
					}
					updatedUser = {
						_id: user._id,
						name: user.name,
						email: user.email,
						password: user.password,
						validTokens: newValidTokens
					}
					
					User.findOneAndUpdate({ _id: decodedAuthToken.id }, updatedUser, (err, doc) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						next();
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		});
	}
}