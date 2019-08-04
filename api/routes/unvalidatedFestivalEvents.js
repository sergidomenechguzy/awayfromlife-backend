const express = require('express');
const mongoose = require('mongoose');

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
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');
const Festival = mongoose.model('festivals');

// FestivalEvents routes
// get all festival events
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const festivalEvents = await UnvalidatedFestivalEvent.find();
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
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
  try {
    const object = await UnvalidatedFestivalEvent.findById(req.params._id);
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

    const latestObjects = await latest.get('unvalidatedFestivalEvent', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
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
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateFestivalEvent.validateObject('unvalidated'),
  async (req, res) => {
    try {
      const festival = await Festival.findById(req.params._id);
      if (!festival) {
        return res
          .status(400)
          .json({ message: 'No festival found with this ID', token: res.locals.token });
      }

      const newUnvalidatedFestivalEvent = await new UnvalidatedFestivalEvent(
        res.locals.validated
      ).save();
      festival.events.push(newUnvalidatedFestivalEvent._id);
      await Festival.findOneAndUpdate({ _id: req.params._id }, festival);
      const dereferenced = await dereference.festivalEventObject(newUnvalidatedFestivalEvent);
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

// validate unvalidated festival event
router.post(
  '/validate/:festivalId/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateFestivalEvent.validateObject('validate'),
  async (req, res) => {
    try {
      if (!res.locals.validated.verifiable) {
        return res.status(400).json({
          message: 'Festival event cannot be validated. All bands have to validated before.',
          token: res.locals.token,
        });
      }
      const festival = await Festival.findById(req.params.festivalId);
      if (!festival) {
        return res
          .status(400)
          .json({ message: 'No festival found with this ID', token: res.locals.token });
      }
      if (!festival.events.includes(req.params._id)) {
        return res.status(400).json({
          message: "Festival event ID not found in the festival's festival events list",
          token: res.locals.token,
        });
      }

      const newFestivalEvent = await new FestivalEvent(res.locals.validated).save();
      festival.events.splice(festival.events.indexOf(req.params._id), 1);
      festival.events.push(newFestivalEvent._id);
      await Festival.findOneAndUpdate({ _id: req.params.festivalId }, festival);
      await UnvalidatedFestivalEvent.remove({ _id: req.params._id });
      const dereferenced = await dereference.festivalEventObject(newFestivalEvent);
      return res
        .status(200)
        .json({ message: 'Event validated', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete festival event by id
router.delete('/:festivalId/:_id', token.checkToken(true), async (req, res) => {
  try {
    const unvalidatedFestivalEvent = await UnvalidatedFestivalEvent.findById(req.params._id);
    if (!unvalidatedFestivalEvent) {
      return res
        .status(400)
        .json({ message: 'No festival event found with this ID', token: res.locals.token });
    }

    const festival = await Festival.findOne({ events: req.params._id });
    if (!festival) {
      return res.status(400).json({
        message: 'No valid festival found with this ID in the festival event list',
        token: res.locals.token,
      });
    }

    await UnvalidatedFestivalEvent.remove({ _id: req.params._id });
    festival.events.splice(festival.events.indexOf(req.params._id), 1);
    await Festival.findOneAndUpdate({ _id: festival._id }, festival);
    return res.status(200).json({ message: 'Festival event deleted', token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
