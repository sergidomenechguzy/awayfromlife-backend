const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// events
router.get('/', (req, res) => {
  Event.find()
    .then(events => {
      res.json(events);
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Event.findOne(id)
    .then(event => {
      res.json(event);
    });
});

router.get('/location/:_id', (req, res) => {
  const id = { location: req.params._id };
  Event.find(id)
    .then(events => {
      res.json(events);
    });
});

router.get('/city/:city', (req, res) => {
  const cityQuery = { city: req.params.city };
  let cityEvents = [];

  Event.find()
    .then((events) => {
      Location.find(cityQuery)
        .then((locations) => {
          events.forEach((event) => {
            locations.forEach((location) => {
              if (event.location == location._id) cityEvents.push(event);
            });
          });
        })
        .then(() => {
          res.json(cityEvents);
        });
    });
});

router.get('/date/:date', (req, res) => {
  let regex = "^" + req.params.date;
  Event.find({startDate: new RegExp(regex, "g")})
    .then((events) => {
      res.json(events);
    });
});

router.post('/', (req, res) => {
  new Event(req.body)
    .save()
    .then(res.send('saved'));
});

router.put('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  const update = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    date: req.body.date
  };
  Event.findOneAndUpdate(id, update, {}, (err, event) => {
    if (err) throw err;
    res.json(event);
  });
});

router.delete('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Event.remove(id, (err, event) => {
    if (err) throw err;
    res.json(event);
  });
});

module.exports = router;