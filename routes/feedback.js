const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load feedback model
require('../models/Feedback');
const Feedback = mongoose.model('feedback');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load validateFeedback.js
const validateFeedback = require('../helpers/validateFeedback');

// feedback routes
// get all feedback
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const feedbacks = await Feedback.find();
		if (feedbacks.length === 0)
			return res.status(200).json({ message: 'No feedback found', token: res.locals.token });

		return res.status(200).json({ data: feedbacks, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post feedback to database
router.post('/', token.checkToken(false), params.checkParameters(['text']), validateFeedback.validateObject(), async (req, res) => {
	try {
		await new Feedback(res.locals.validated).save();
		return res.status(200).json({ message: 'Feedback saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete feedback by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'feedback');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

module.exports = router;
