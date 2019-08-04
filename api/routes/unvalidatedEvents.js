const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateEvent = require('../helpers/validateEvent');
const multerConfig = require('../config/multerConfig');
const rateLimit = require('../config/rateLimit');
require('../models/Event');

const router = express.Router();

const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// unvalidated_events routes
// get all events
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const unvalidatedEvents = await UnvalidatedEvent.find();
    if (unvalidatedEvents.length === 0) {
      return res.status(200).json({ message: 'No events found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(unvalidatedEvents, 'event', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get event by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
  try {
    const object = await UnvalidatedEvent.findById(req.params._id);
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No event found with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.eventObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added events
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('unvalidatedEvent', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post event to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateEvent.validateObject('unvalidated', 'unvalidated'),
  async (req, res) => {
    try {
      const newEvent = await new UnvalidatedEvent(res.locals.validated).save();
      const dereferenced = await dereference.eventObject(newEvent);
      return res
        .status(200)
        .json({ message: 'Event saved', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post multiple events to database
router.post(
  '/multiple',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateEvent.validateList('unvalidated', 'unvalidated'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const result = await new UnvalidatedEvent(object).save();
        return result;
      });
      const responseList = await Promise.all(promises);
      const dereferenced = await dereference.objectArray(responseList, 'event', 'name', 1);
      return res.status(200).json({
        message: `${responseList.length} event(s) saved`,
        data: dereferenced,
        token: res.locals.token,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post multiple events to database from json file
router.post(
  '/fromJSON',
  token.checkToken(false),
  multerConfig.uploadJSON.single('file'),
  validateEvent.validateFromJson('unvalidated', 'unvalidated'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const result = await new UnvalidatedEvent(object).save();
        return result;
      });
      const responseList = await Promise.all(promises);
      const dereferenced = await dereference.objectArray(responseList, 'event', 'name', 1);
      return res.status(200).json({
        message: `${responseList.length} event(s) saved`,
        data: dereferenced,
        token: res.locals.token,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post event to database
router.post(
  '/validate/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateEvent.validateObject('validate', 'unvalidated'),
  async (req, res) => {
    try {
      if (!res.locals.validated.verifiable) {
        return res.status(400).json({
          message:
            'Event cannot be validated. The location and all bands have to validated before.',
          token: res.locals.token,
        });
      }
      let newEvent = res.locals.validated;
      let category;
      if (new Date(newEvent.date) < new Date().setUTCHours(0, 0, 0, 0)) {
        newEvent = await new ArchivedEvent(newEvent).save();
        category = 'events archive';
      } else {
        newEvent = await new Event(newEvent).save();
        category = 'events';
      }
      await UnvalidatedEvent.remove({ _id: req.params._id });
      const dereferenced = await dereference.eventObject(newEvent);
      return res.status(200).json({
        message: `Event validated and saved to ${category}`,
        data: dereferenced,
        token: res.locals.token,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'unvalidatedEvent');
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
