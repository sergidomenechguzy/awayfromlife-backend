const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load bug model
require('../models/Bug');
const Bug = mongoose.model('bugs');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load validateBug.js
const validateBug = require('../helpers/validateBug');

// bugs routes
// get all bugs
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const bugs = await Bug.find();
		if (bugs.length === 0)
			return res.status(200).json({ message: 'No bugs found', token: res.locals.token });

		return res.status(200).json({ data: bugs, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post bug to database
router.post('/', token.checkToken(false), params.checkParameters(['error']), validateBug.validateObject(), async (req, res) => {
	try {
		await new Bug(res.locals.validated).save();
		return res.status(200).json({ message: 'Bug saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete bug by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'bug');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;
