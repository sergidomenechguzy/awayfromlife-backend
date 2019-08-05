const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateBand = require('../helpers/validateBand');
const multerConfig = require('../config/multerConfig');
const rateLimit = require('../config/rateLimit');
require('../models/Event');
require('../models/Band');
require('../models/FestivalEvent');

const router = express.Router();

const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// unvalidated_bands routes
// get all bands
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const bands = await UnvalidatedBand.find();
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No bands found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get band by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
  try {
    const object = await UnvalidatedBand.findById(req.params._id);
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No band found with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.bandObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added bands
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('unvalidatedBand', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post band to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateBand.validateObject('unvalidated'),
  async (req, res) => {
    try {
      const newBand = await new UnvalidatedBand(res.locals.validated).save();
      const dereferenced = await dereference.bandObject(newBand);
      return res
        .status(200)
        .json({ message: 'Band saved', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post multiple bands to database
router.post(
  '/multiple',
  token.checkToken(false),
  multerConfig.upload.single('image'),
  validateBand.validateList('post'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const result = await new UnvalidatedBand(object).save();
        return result;
      });
      const responseList = await Promise.all(promises);
      return res
        .status(200)
        .json({ message: `${responseList.length} band(s) saved`, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// validate unvalidated band
router.post(
  '/validate/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateBand.validateObject('validate'),
  async (req, res) => {
    try {
      const newBand = await new Band(res.locals.validated).save();
      await Promise.all([
        deleteRoute.deleteBandFromEventCollection(Event, req.params._id, newBand._id),
        deleteRoute.deleteBandFromEventCollection(UnvalidatedEvent, req.params._id, newBand._id),
        deleteRoute.deleteBandFromEventCollection(FestivalEvent, req.params._id, newBand._id),
        deleteRoute.deleteBandFromEventCollection(
          UnvalidatedFestivalEvent,
          req.params._id,
          newBand._id
        ),
      ]);
      await UnvalidatedBand.remove({ _id: req.params._id });
      const dereferenced = await dereference.bandObject(newBand);
      return res
        .status(200)
        .json({ message: 'Band validated', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'unvalidatedBand');
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
