const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
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
// login by login-token in body
router.post('/login', (req, res) => {
	if (!req.body.token) {
		return res.status(400).json({ message: 'Token missing' });
	}
	
	jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Unvalid token' });

		User.findOne({ email: decodedToken.email })
		.then(user => {
			if (!user) {
				return res.status(400).json({ message: 'Wrong email or password' });
			}
			bcrypt.compare(decodedToken.password, user.password, (err, isMatch) => {
				if (err) throw err;
				if (!isMatch) {
					return res.status(400).json({ message: 'Wrong email or password' });
				}
				res.status(200).json({ message: 'You are logged in', token: token.signJWT(user.id) });
			})
		})
		.catch((err) => {
			throw err;
		});
	});
});

// register by register-token in body
router.post('/register', (req, res) => {
	if (!req.body.token) {
		return res.status(400).json({ message: 'Token missing' });
	}
	jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Unvalid token' });

		const newUser = new User({
			name: decodedToken.name,
			email: decodedToken.email,
			password: decodedToken.password
		});
	
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(newUser.password, salt, (err, hash) => {
				if (err) throw err;
				newUser.password = hash;
				newUser.save()
					.then(res.status(200).json({ message: 'User registered' }))
					.catch((err) => {
						throw err;
					});
			});
		});
	});
});

// reset password by password-token in body
router.post('/reset-password', passport.authenticate('jwt', { session: false }), (req, res) => {
	jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, (err, decodedAuthToken) => {
		if (err) return res.status(400).json({ message: 'Unvalid token' });
	
		if (!req.body.token) {
			return res.status(400).json({ message: 'Password-token missing' });
		}
		jwt.verify(req.body.token, secrets.frontEndSecret, (err, decodedPasswordToken) => {
			if (err) return res.status(400).json({ message: 'Unvalid token' });

			if (decodedPasswordToken.newPassword.length < 8) {
				return res.status(400).json({ message: 'Password must be at least 8 characters' });
			}
	
			User.findOne({ _id: decodedAuthToken.id })
				.then(user => {
					if (!user) {
						return res.status(400).json({ message: 'An error occurred. Please try again.' });
					}
					bcrypt.compare(decodedPasswordToken.oldPassword, user.password, (err, isMatch) => {
						if (err) throw err;
						if (!isMatch) {
							return res.status(400).json({ message: 'Wrong password' });
						}
						bcrypt.genSalt(10, (err, salt) => {
							bcrypt.hash(decodedPasswordToken.newPassword, salt, (err, hash) => {
								if (err) throw err;
								updatedUser = {
									_id: user._id,
									name: user.name,
									email: user.email,
									password: hash,
									lastModified: Date.now()
								}
								User.findOneAndUpdate({ _id: decodedAuthToken.id }, updatedUser, (err, doc) => {
									if (err) throw err;
									return res.status(200).json({ message: 'Password changed', token: token.signJWT(user.id) });
								});
							});
						});
					})
				})
				.catch((err) => {
					throw err;
				});
		});
	});
});

// check authentication
router.get('/auth', passport.authenticate('jwt', { session: false }), (req, res) => {
	return res.status(200).json({ message: 'You are authorized', token: token.signJWT(req.user.id) });
});

module.exports = router;
