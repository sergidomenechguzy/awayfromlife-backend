const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load bug model
require('../models/Bug');
const Bug = mongoose.model('bugs');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load validateBug.js
const validateBug = require('../helpers/validateBug');

// bugs routes
// get all bugs
router.get('/', token.checkToken(true), (req, res) => {
	Bug.find()
		.then(bugs => {
			if (bugs.length === 0) 
				return res.status(200).json({ message: 'No bugs found', token: res.locals.token });
			
			return res.status(200).json({ data: bugs, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post bug to database
router.post('/', token.checkToken(false), params.checkParameters(['error']), validateBug.validateObject(), (req, res) => {
	new Bug(res.locals.validated)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Bug saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete bug by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Bug.findById(req.params._id)
		.then(bug => {
			if (!bug) 
				return res.status(400).json({ message: 'No bug found with this ID', token: res.locals.token });
			Bug.remove({ _id: req.params._id }, (err, bug) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Bug deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
