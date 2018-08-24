const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load feedback model
require('../models/Feedback');
const Feedback = mongoose.model('feedback');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');

// feedback routes
// get all feedback
router.get('/', token.checkToken(true), (req, res) => {
	Feedback.find()
		.then(feedbacks => {
			if (feedbacks.length === 0) 
				return res.status(200).json({ message: 'No feedback found', token: res.locals.token });
			
			return res.status(200).json({ data: feedbacks, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post feedback to database
router.post('/', token.checkToken(false), params.checkParameters(['text']), (req, res) => {
	const newFeedback = {
		text: req.body.text,
		email: req.body.email
	};
	new Feedback(newFeedback)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Feedback saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete feedback by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Feedback.findOne({ _id: req.params._id })
		.then(feedback => {
			if (!feedback) 
				return res.status(400).json({ message: 'No feedback found with this ID', token: res.locals.token });
			Feedback.remove({ _id: req.params._id }, (err, feedback) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Feedback deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
