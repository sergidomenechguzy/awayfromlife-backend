const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const uuidv4 = require('uuid/v4');

// load user model
require('../models/User');
const User = mongoose.model('users');

// load secrets
const secrets = require('../config/secrets');

const expTime = (20 * 60);
module.exports.expTime = expTime;

// signs jwt with given user id
module.exports.signJWT = (userID, sessionID) => {
	return jwt.sign({userID: userID, sessionID: sessionID, exp: Math.floor(Date.now() / 1000) + expTime}, secrets.authSecret);
}

module.exports.createSession = () => {
	return {
		sessionID: uuidv4(),
		expireTime: Math.floor(Date.now() / 1000) + expTime
	};
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

			User.findOne({ _id: decodedAuthToken.userID })
				.then(user => {
					if (!user) {
						if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
						return next();
					}

					let sessionIndex;
					if (
						!user.currentSessions.some((session, index, array) => {
							if (session.sessionID === decodedAuthToken.sessionID && session.expireTime > Math.floor(Date.now() / 1000)) {
								sessionIndex = index;
								return true
							};
							return false;
						})
					) {
						if (forbidden) return res.status(401).json({ message: 'Unauthorized' });
						return next();
					}

					const exp = Math.floor(Date.now() / 1000) + expTime;
					user.currentSessions[sessionIndex].expireTime = exp;
					User.findOneAndUpdate({ _id: decodedAuthToken.userID }, user, (err, doc) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						res.locals.token = jwt.sign({userID: decodedAuthToken.userID, sessionID: decodedAuthToken.sessionID, exp: exp}, secrets.authSecret);
						return next();
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		});
	}
}