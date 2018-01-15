const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load bug model
require('../models/Bug');
const Bug = mongoose.model('bugs');

//load params
const params = require('../config/params.js');

// bugs routes
router.get('/', (req, res) => {
	Bug.find()
		.then(bugs => {
			if (bugs.length == 0) {
				return res.status(200).json({ message: "No bugs found" });
			}
			return res.json(bugs);
		})
		.catch((err) => {
			throw err;
		});
});

router.post('/', params.checkParameters(["function"]), (req, res) => {
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
			return res.status(200).json({ message: "Bug saved" })
		})
		.catch((err) => {
			throw err;
		});
});

router.delete('/:_id', (req, res) => {
	const id = { _id: req.params._id };
	Bug.remove(id, (err, bug) => {
		if (err) throw err;
		return res.status(200).json({ message: "Bug deleted" });
	});
});

module.exports = router;
