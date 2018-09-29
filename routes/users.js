const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// load user model
require('../models/User');
const User = mongoose.model('users');

// load secrets
const secrets = require('../config/secrets');
// load token.js
const token = require('../config/token');

// users routes
// logout and clear current valid token
router.get('/logout', (req, res) => {
	if (!req.headers.authorization || req.headers.authorization.split(' ')[0] != 'JWT')
		return res.status(401).json({ message: 'Unauthorized' });

	jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
		if (err) return res.status(401).json({ message: 'Unauthorized' });

		User.findById(decodedAuthToken.userID)
			.then(user => {
				if (!user) return res.status(401).json({ message: 'Unauthorized' });

				let sessionIndex;
				if (
					!user.currentSessions.some((session, index, array) => {
						if (session.sessionID === decodedAuthToken.sessionID && session.expireTime > Math.floor(Date.now() / 1000)) {
							sessionIndex = index;
							return true
						};
						return false;
					})
				) return res.status(401).json({ message: 'Unauthorized' });
				user.currentSessions.splice(sessionIndex, 1);

				User.findOneAndUpdate({ _id: user.id }, user, (err, doc) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					res.status(200).json({ message: 'Successfully logged out.' });
				});
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// check authorization
router.get('/auth', token.checkToken(true), (req, res) => {
	return res.status(200).json({ message: 'You are authorized', token: res.locals.token });
});

// login by login-token in body
router.post('/login', (req, res) => {
	if (!req.body.token) return res.status(400).json({ message: 'Token missing' });

	jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Invalid token' });

		User.findOne({ email: decodedToken.email })
			.then(user => {
				if (!user) return res.status(400).json({ message: 'Wrong email or password' });
				
				bcrypt.compare(decodedToken.password, user.password, (err, isMatch) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					if (!isMatch) return res.status(400).json({ message: 'Wrong email or password' });

					const session = token.createSession();
					const newToken = token.signJWT(user.id, session.sessionID);
					let expiredSessions = [];
					user.currentSessions.forEach((session, index, array) => {
						if (session.expireTime < Math.floor(Date.now() / 1000)) expiredSessions.push(index);
					});
					expiredSessions.forEach(index => {
						user.currentSessions.splice(index, 1);
					});
					user.currentSessions.push(session);

					User.findOneAndUpdate({ _id: user.id }, user, (err, doc) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						res.status(200).json({ message: 'You are logged in.', token: newToken });
					});
				})
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// register by register-token in body
router.post('/register', (req, res) => {
	if (!req.body.token) return res.status(400).json({ message: 'Token missing' });
	
	jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Unvalid token' });

		if (decodedToken.password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

		const newUser = new User({
			name: decodedToken.name,
			email: decodedToken.email,
			password: decodedToken.password
		});

		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(newUser.password, salt, (err, hash) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				newUser.password = hash;
				newUser.save()
					.then(res.status(200).json({ message: 'User registered' }))
					.catch(err => {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					});
			});
		});
	});
});

// reset password by password-token in body
router.post('/reset-password', token.checkToken(true), (req, res) => {
	jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
		if (err) return res.status(400).json({ message: 'Unvalid token' });

		if (!req.body.token) return res.status(400).json({ message: 'Password-token missing' });

		jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedPasswordToken) => {
			if (err) return res.status(400).json({ message: 'Unvalid token' });

			if (decodedPasswordToken.newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

			User.findById(decodedAuthToken.userID)
				.then(user => {
					if (!user) return res.status(400).json({ message: 'An error occurred. Please try again.' });

					bcrypt.compare(decodedPasswordToken.oldPassword, user.password, (err, isMatch) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						if (!isMatch) return res.status(400).json({ message: 'Wrong password' });

						bcrypt.genSalt(10, (err, salt) => {
							bcrypt.hash(decodedPasswordToken.newPassword, salt, (err, hash) => {
								if (err) {
									console.log(err.name + ': ' + err.message);
									return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
								}
								const session = token.createSession();
								const newToken = token.signJWT(user.id, session.sessionID);

								let sessionIndex;
								user.currentSessions.some((session, index, array) => {
									if (session.sessionID === decodedAuthToken.sessionID) {
										sessionIndex = index;
										return true
									};
									return false;
								});
								user.currentSessions.splice(sessionIndex, 1);

								user.password = hash;
								user.currentSessions.push(session);

								User.findOneAndUpdate({ _id: decodedAuthToken.userID }, user, (err, doc) => {
									if (err) {
										console.log(err.name + ': ' + err.message);
										return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
									}
									return res.status(200).json({ message: 'Password changed', token: newToken });
								});
							});
						});
					})
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		});
	});
});

module.exports = router;
