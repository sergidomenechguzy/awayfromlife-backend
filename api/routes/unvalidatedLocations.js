const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateLocation = require('../helpers/validateLocation');
const multerConfig = require('../config/multerConfig');
const rateLimit = require('../config/rateLimit');
require('../models/Location');
require('../models/Event');

const router = express.Router();

const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');
const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// unvalidated_locations routes
// get all locations
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const unvalidatedLocations = await UnvalidatedLocation.find();
    if (unvalidatedLocations.length === 0) {
      return res.status(200).json({ message: 'No locations found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(unvalidatedLocations, 'location', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get location by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
  try {
    const object = await UnvalidatedLocation.findById(req.params._id);
    if (!object) {
      return res.status(400).json({ message: 'No location with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.locationObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added locations
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('location', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post location to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateLocation.validateObject('unvalidated'),
  async (req, res) => {
    try {
      const newLocation = await new UnvalidatedLocation(res.locals.validated).save();
      const dereferenced = await dereference.locationObject(newLocation);
      return res
        .status(200)
        .json({ message: 'Location saved', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post multiple locations to database
router.post(
  '/multiple',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateLocation.validateList('unvalidated'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const result = await new UnvalidatedLocation(object).save();
        return result;
      });
      const responseList = await Promise.all(promises);
      return res
        .status(200)
        .json({ message: `${responseList.length} location(s) saved`, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// validate unvalidated location
router.post(
  '/validate/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateLocation.validateObject('validate'),
  async (req, res) => {
    try {
      const newLocation = await new Location(res.locals.validated).save();
      await Promise.all([
        deleteRoute.deleteLocationFromEventCollection(Event, req.params._id, newLocation._id),
        deleteRoute.deleteLocationFromEventCollection(
          UnvalidatedEvent,
          req.params._id,
          newLocation._id
        ),
      ]);
      await UnvalidatedLocation.remove({ _id: req.params._id });
      const dereferenced = await dereference.locationObject(newLocation);
      return res
        .status(200)
        .json({ message: 'Location validated', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete location by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'unvalidatedLocation');
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
