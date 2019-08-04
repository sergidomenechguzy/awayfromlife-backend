const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateFestivalAndFestivalEvent = require('../helpers/validateFestivalAndFestivalEvent');
const multerConfig = require('../config/multerConfig');
const rateLimit = require('../config/rateLimit');
require('../models/Festival');
require('../models/FestivalEvent');

const router = express.Router();

const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// festivals routes
// get all festivals
router.get('/', token.checkToken(true), async (req, res) => {
  try {
    const unvalidatedFestivals = await UnvalidatedFestival.find();
    if (unvalidatedFestivals.length === 0) {
      return res.status(200).json({ message: 'No festival events found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(
      unvalidatedFestivals,
      'unvalidatedFestival',
      'name',
      1
    );
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all festivals with unvalidated festival events
router.get('/unvalidated', token.checkToken(false), async (req, res) => {
  try {
    const unvalidatedFestivalEvents = await UnvalidatedFestivalEvent.find();
    if (unvalidatedFestivalEvents.length === 0) {
      return res.status(200).json({ message: 'No festival events found', token: res.locals.token });
    }

    const dereferencedFestivalEvents = await dereference.objectArray(
      unvalidatedFestivalEvents,
      'festivalEvent',
      'name',
      1
    );

    const promises = dereferencedFestivalEvents.map(event => {
      return new Promise(async (resolve, reject) => {
        try {
          const festival = await Festival.findOne({ events: event._id });
          if (!festival) {
            const unvalidatedFestival = await UnvalidatedFestival.findOne({ events: event._id });
            if (!unvalidatedFestival) {
              return resolve(
                `No festival found for the festival event: (_id: ${event._id}, name: ${
                  event.name
                }).`
              );
            }
            const finalFestival = await dereference.unvalidatedFestivalObject(unvalidatedFestival);
            return resolve({ validated: false, festival: finalFestival, event });
          }
          const finalFestival = await dereference.unvalidatedFestivalObject(festival);
          return resolve({ validated: true, festival: finalFestival, event });
        } catch (err) {
          return reject(err);
        }
      });
    });
    const responseList = await Promise.all(promises);
    return res.status(200).json({ data: responseList, token: res.locals.token });
  } catch (err) {
    if (typeof err === 'string') {
      return res.status(400).json({ message: err, token: res.locals.token });
    }
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get festival by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
  try {
    const object = await UnvalidatedFestival.findById(req.params._id);
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No festival found with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.unvalidatedFestivalObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added festivals
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('unvalidatedFestival', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post festival and event to database
router.post(
  '/',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.fields([
    { name: 'festivalImage', maxCount: 1 },
    { name: 'eventImage', maxCount: 1 },
  ]),
  validateFestivalAndFestivalEvent.validateObject('unvalidated'),
  async (req, res) => {
    try {
      const newFestivalEvent = await new UnvalidatedFestivalEvent(
        res.locals.validated.event
      ).save();
      let newFestival = res.locals.validated.festival;
      newFestival.events = [newFestivalEvent._id];
      newFestival = await new UnvalidatedFestival(newFestival).save();
      const dereferenced = await dereference.unvalidatedFestivalObject(newFestival);
      dereferenced.events = [await dereference.festivalEventObject(newFestivalEvent)];
      return res.status(200).json({
        message: 'Festival and festival event saved',
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

// post multiple festivals and events to database
router.post(
  '/multiple',
  rateLimit.dataLimiter,
  token.checkToken(false),
  multerConfig.upload.fields([
    { name: 'festivalImage', maxCount: 1 },
    { name: 'eventImage', maxCount: 1 },
  ]),
  validateFestivalAndFestivalEvent.validateList('post'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const newFestivalEvent = await new UnvalidatedFestivalEvent(object.event).save();
        const dereferencedEvent = await dereference.festivalEventObject(newFestivalEvent);
        let newFestival = object.festival;
        newFestival.events = [newFestivalEvent._id];
        newFestival = await new UnvalidatedFestival(newFestival).save();
        const dereferenced = await dereference.unvalidatedFestivalObject(newFestival);
        dereferenced.events = [dereferencedEvent];
        return dereferenced;
      });
      const responseList = await Promise.all(promises);
      return res.status(200).json({
        message: `${responseList.length} festivals(s) and festival event(s) saved`,
        data: responseList,
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

// validate unvalidated festival and festival event
router.post(
  '/validate/:festivalId/:eventId',
  token.checkToken(true),
  multerConfig.upload.fields([
    { name: 'festivalImage', maxCount: 1 },
    { name: 'eventImage', maxCount: 1 },
  ]),
  validateFestivalAndFestivalEvent.validateObject('validate'),
  async (req, res) => {
    try {
      if (!res.locals.validated.event.verifiable) {
        return res.status(400).json({
          message: 'Festival event cannot be validated. All bands have to validated before.',
          token: res.locals.token,
        });
      }
      const newFestivalEvent = await new FestivalEvent(res.locals.validated.event).save();
      let newFestival = res.locals.validated.festival;
      newFestival.events = [newFestivalEvent._id];
      newFestival = await new Festival(newFestival).save();
      await UnvalidatedFestival.remove({ _id: req.params.festivalId });
      await UnvalidatedFestivalEvent.remove({ _id: req.params.eventId });
      const dereferenced = await dereference.festivalObject(newFestival);
      return res.status(200).json({
        message: 'Festival and festival event validated',
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

// delete festival by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'unvalidatedFestival');
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
