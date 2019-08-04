const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const validateFeedback = require('../helpers/validateFeedback');
const rateLimit = require('../config/rateLimit');
require('../models/Feedback');

const router = express.Router();

const Feedback = mongoose.model('feedback');

// feedback routes
// get all feedback
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    if (feedbacks.length === 0) {
      return res.status(200).json({ message: 'No feedback found', token: res.locals.token });
    }

    return res.status(200).json({ data: feedbacks, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added feedback
router.get('/latest', token.checkToken(true), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('feedback', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post feedback to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  validateFeedback.validateObject(),
  async (req, res) => {
    try {
      await new Feedback(res.locals.validated).save();
      return res.status(200).json({ message: 'Feedback saved', token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete feedback by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'feedback');
    return res.status(response.status).json({ message: response.message, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
