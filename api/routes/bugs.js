const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const validateBug = require('../helpers/validateBug');
const rateLimit = require('../config/rateLimit');
require('../models/Bug');

const router = express.Router();

const Bug = mongoose.model('bugs');

// bugs routes
// get all bugs
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const bugs = await Bug.find();
    if (bugs.length === 0) {
      return res.status(200).json({ message: 'No bugs found', token: res.locals.token });
    }

    return res.status(200).json({ data: bugs, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added bugs
router.get('/latest', token.checkToken(true), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('bug', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post bug to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  validateBug.validateObject(),
  async (req, res) => {
    try {
      await new Bug(res.locals.validated).save();
      return res.status(200).json({ message: 'Bug saved', token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete bug by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'bug');
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
