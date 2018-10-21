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
	if (req.headers.authorization == undefined || req.headers.authorization.split(' ')[0] != 'JWT')
		return res.status(401).json({ message: 'Unauthorized' });

	jwt.verify(req.headers.authorization.split(' ')[1], secrets.authSecret, async (err, decodedAuthToken) => {
		if (err) return res.status(401).json({ message: 'Unauthorized' });

		try {
			const user = await User.findById(decodedAuthToken.userID);
			if (!user) return res.status(401).json({ message: 'Unauthorized' });

			let updatedUser = JSON.parse(JSON.stringify(user));
			updatedUser.currentSessions = user.currentSessions.filter(session => (!(session.sessionID == decodedAuthToken.sessionID) && (session.expireTime > Math.floor(Date.now() / 1000))));

			await User.findOneAndUpdate({ _id: user.id }, updatedUser);
			return res.status(200).json({ message: 'Successfully logged out.' });
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	});
});

// check authorization
router.get('/auth', token.checkToken(true), (req, res) => {
	return res.status(200).json({ message: 'You are authorized', token: res.locals.token });
});

// login by login-token in body
router.post('/login', (req, res) => {
	if (req.body.token == undefined) return res.status(400).json({ message: 'Token missing' });

	jwt.verify(req.body.token, secrets.frontEndSecret, async (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Invalid token' });

		try {
			const user = await User.findOne({ email: decodedToken.email });
			if (!user) return res.status(400).json({ message: 'Wrong email or password' });

			const isMatch = await bcrypt.compare(decodedToken.password, user.password);
			if (!isMatch) return res.status(400).json({ message: 'Wrong email or password' });

			const session = token.createSession();
			const newToken = token.signJWT(user.id, session.sessionID);
			
			let updatedUser = JSON.parse(JSON.stringify(user));
			updatedUser.currentSessions = user.currentSessions.filter(session => session.expireTime > Math.floor(Date.now() / 1000));
			updatedUser.currentSessions.push(session);

			await User.findOneAndUpdate({ _id: user.id }, updatedUser);
			return res.status(200).json({ message: 'You are logged in.', token: newToken });
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	});
});

// register by register-token in body
router.post('/register', token.checkToken(true), (req, res) => {
	if (req.body.token == undefined) return res.status(400).json({ message: 'Token missing' });

	jwt.verify(req.body.token, secrets.frontEndSecret, async (err, decodedToken) => {
		if (err) return res.status(400).json({ message: 'Invalid token' });

		try {
			if (decodedToken.password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
			const user = await User.findOne({ email: decodedToken.email });
			if (user) return res.status(400).json({ message: 'Email address already registered.' });

			const hash = await bcrypt.hash(decodedToken.password, 10);
			const newUser = {
				name: decodedToken.name,
				email: decodedToken.email,
				password: hash
			};
			await new User(newUser).save();
			return res.status(200).json({ message: 'User registered', token: res.locals.token });
		}
		catch (err) {
			console.log(err);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
		}
	});
});

// reset password by password-token in body
router.post('/reset-password', token.checkToken(true), async (req, res) => {
	try {
		const decodedAuthToken = jwt.verify(res.locals.token, secrets.authSecret);
		if (!req.body.token) return res.status(400).json({ message: 'Password-token missing' });

		jwt.verify(req.body.token, secrets.frontEndSecret, async (err, decodedPasswordToken) => {
			if (err) return res.status(400).json({ message: 'Invalid token' });

			try {
				if (decodedPasswordToken.newPassword.length < 8)
					return res.status(400).json({ message: 'Password must be at least 8 characters' });

				const user = await User.findById(decodedAuthToken.userID);
				if (!user) return res.status(400).json({ message: 'An error occurred. Please try again.' });

				const isMatch = await bcrypt.compare(decodedPasswordToken.oldPassword, user.password);
				if (!isMatch) return res.status(400).json({ message: 'Wrong password' });
				const hash = await bcrypt.hash(decodedPasswordToken.newPassword, 10);

				const session = token.createSession();
				const newToken = token.signJWT(user.id, session.sessionID);

				let updatedUser = JSON.parse(JSON.stringify(user));
				updatedUser.password = hash;
				updatedUser.currentSessions = [session];

				await User.findOneAndUpdate({ _id: decodedAuthToken.userID }, updatedUser);
				return res.status(200).json({ message: 'Password changed and logged out from all current sessions.', token: newToken });
			}
			catch (err) {
				console.log(err);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
			}
		});
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;
