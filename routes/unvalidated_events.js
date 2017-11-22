const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('unvalidated_events');

// unvalidated_events routes
router.get('/', (req, res) => {
  Event.find()
    .then(events => {
      res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Event.findOne(id)
    .then(event => {
      res.json(event);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/title/:title', (req, res) => {
  let regex = ".*" + req.params.title + ".*";
  Event.find({ title: new RegExp(regex, "gi") })
    .then((events) => {
      res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/date/:date', (req, res) => {
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
    .then(res.send('saved'))
    .catch((err) => {
      throw err;
    });
});

router.delete('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Event.remove(id, (err, event) => {
    if (err) throw err;
    res.json('deleted');
  });
});

module.exports = router;