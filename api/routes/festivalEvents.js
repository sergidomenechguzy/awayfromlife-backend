const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateFestivalEvent = require('../helpers/validateFestivalEvent');
const multerConfig = require('../config/multerConfig');
const rateLimit = require('../config/rateLimit');
require('../models/FestivalEvent');
require('../models/Festival');

const router = express.Router();

const FestivalEvent = mongoose.model('festival_events');
const Festival = mongoose.model('festivals');

// FestivalEvents routes
// get all festival events
router.get('/', token.checkToken(false), async (req, res) => {
  try {
    const festivalEvents = await FestivalEvent.find();
    if (festivalEvents.length === 0) {
      return res.status(200).json({ message: 'No festival events found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(festivalEvents, 'festivalEvent', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get festival event by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
  try {
    const object = await FestivalEvent.findById(req.params._id);
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No festival event found with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.festivalEventObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added festival events
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('festivalEvent', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get canceled festival events
router.get('/canceled', token.checkToken(false), async (req, res) => {
  try {
    const festivalEvents = await FestivalEvent.find({ canceled: 1 });
    if (festivalEvents.length === 0) {
      return res
        .status(200)
        .json({ message: 'No canceled festival events found.', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(festivalEvents, 'festivalEvent', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get similar festival events
router.get('/similar', token.checkToken(false), async (req, res) => {
  try {
    if (!req.query.festival || !req.query.startDate || !req.query.endDate) {
      return res
        .status(400)
        .json({ message: 'Parameter(s) missing: festival, startDate and endDate are required.' });
    }

    const festival = await Festival.findById(req.query.festival);
    if (!festival) {
      return res
        .status(400)
        .json({ message: 'No festival found with this ID.', token: res.locals.token });
    }

    const dereferenced = await dereference.festivalObject(festival);
    let similarFestivalEvent;
    dereferenced.events.some(festivalEvent => {
      if (
        festivalEvent.startDate.localeCompare(req.query.endDate) <= 0 &&
        festivalEvent.endDate.localeCompare(req.query.startDate) >= 0
      ) {
        similarFestivalEvent = festivalEvent;
        return true;
      }
      return false;
    });
    if (similarFestivalEvent === undefined) {
      return res
        .status(200)
        .json({ message: 'No similar festival events found.', token: res.locals.token });
    }

    return res.status(200).json({ data: similarFestivalEvent, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post festival event to database
router.post(
  '/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateFestivalEvent.validateObject('post'),
  async (req, res) => {
    try {
      const festival = await Festival.findById(req.params._id);
      if (!festival) {
        return res
          .status(400)
          .json({ message: 'No festival found with this ID', token: res.locals.token });
      }

      const newFestivalEvent = await new FestivalEvent(res.locals.validated).save();
      festival.events.push(newFestivalEvent._id);
      await Festival.findOneAndUpdate({ _id: req.params._id }, festival);
      const dereferenced = await dereference.festivalEventObject(newFestivalEvent);
      return res
        .status(200)
        .json({ message: 'Festival event saved', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// update festival event by id
router.put(
  '/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateFestivalEvent.validateObject('put'),
  async (req, res) => {
    try {
      const updated = await FestivalEvent.findOneAndUpdate(
        { _id: req.params._id },
        res.locals.validated,
        { new: true }
      );
      const dereferenced = await dereference.festivalEventObject(updated);
      return res
        .status(200)
        .json({ message: 'Festival event updated', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// cancel festival event by id
router.put('/cancel/:_id', rateLimit.dataLimiter, token.checkToken(false), async (req, res) => {
  try {
    const event = await FestivalEvent.findById(req.params._id);
    if (!event) {
      return res
        .status(400)
        .json({ message: 'No festival event found with this ID', token: res.locals.token });
    }

    event.canceled = 1;

    const updated = await FestivalEvent.findOneAndUpdate({ _id: req.params._id }, event, {
      new: true,
    });
    const dereferenced = await dereference.festivalEventObject(updated);
    return res
      .status(200)
      .json({ message: 'Festival event canceled', data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// delete festival event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'festivalEvent');
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
