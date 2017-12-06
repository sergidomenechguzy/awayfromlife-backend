const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('unvalidated_events');

// unvalidated_events routes
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
  Event.find()
    .then(events => {
      res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Event.findOne(id)
    .then(event => {
      res.json(event);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/title/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
  let regex = ".*" + req.params.title + ".*";
  Event.find({ title: new RegExp(regex, "gi") })
    .then((events) => {
      res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/date/:date', passport.authenticate('jwt', { session: false }), (req, res) => {
  let regex = "^" + req.params.date;
  Event.find({ startDate: new RegExp(regex, "g") })
    .then((events) => {
      res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/', (req, res) => {
  const newEvent = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    time: req.body.time
  }
  new Event(newEvent)
    .save()
    .then(res.status(200).json({ message: "Event saved" }))
    .catch((err) => {
      throw err;
    });
});

router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Event.remove(id, (err, event) => {
    if (err) throw err;
    res.status(200).json({ message: "Event deleted" });
  });
});

module.exports = router;