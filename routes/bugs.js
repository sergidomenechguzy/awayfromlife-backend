const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load bug model
require('../models/Bug');
const Bug = mongoose.model('bugs');

// load params
const params = require('../config/params.js');

// bugs routes
// get all bugs
router.get('/', (req, res) => {
	Bug.find()
		.then(bugs => {
			if (bugs.length === 0) {
				return res.status(200).json({ message: 'No bugs found' });
			}
			return res.status(200).json(bugs);
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post bug to database
router.post('/', params.checkParameters(['function']), (req, res) => {
	const newBug = {
		function: req.body.function,
		description: req.body.description,
		loggedIn: req.body.loggedIn,
		component: req.body.component,
		email: req.body.email
	};
	new Bug(newBug)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Bug saved' })
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete bug by id
router.delete('/:_id', (req, res) => {
	Bug.remove({ _id: req.params._id }, (err, bug) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(200).json({ message: 'Bug deleted' });
	});
});

module.exports = router;
