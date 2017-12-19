const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

//load params
const params = require('../config/params.js');

// events routes
router.get('/', (req, res) => {
  Event.find()
    .then(events => {
      if (events.length == 0) {
        return res.status(200).json({ message: "No events found" });
      }
      return res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Event.findOne(id)
    .then(event => {
      if (!event) {
        return res.status(200).json({ message: "No event found with this ID" });
      }
      return res.json(event);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/title/:title', (req, res) => {
  let regex = ".*" + req.params.title + ".*";
  Event.find({ title: new RegExp(regex, "gi") })
    .then((events) => {
      if (events.length == 0) {
        return res.status(200).json({ message: "No event found with this title" });
      }
      return res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/location/:_id', (req, res) => {
  const id = { location: req.params._id };
  Event.find(id)
    .then(events => {
      if (events.length == 0) {
        return res.status(200).json({ message: "No events found for this location" });
      }
      return res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/city/:city', (req, res) => {
  const cityQuery = { city: req.params.city };
  let cityEvents = [];

  Event.find()
    .then((events) => {
      if (events.length == 0) {
        return res.status(200).json({ message: "No events found" });
      }
      Location.find(cityQuery)
        .then((locations) => {
          if (locations.length == 0) {
            return res.status(200).json({ message: "No locations found" });
          }
          events.forEach((event) => {
            locations.forEach((location) => {
              if (event.location == location._id) cityEvents.push(event);
            });
          });
        })
        .then(() => {
          if (cityEvents.length == 0) {
            return res.status(200).json({ message: "No events found for this location" });
          }
          return res.json(cityEvents);
        })
        .catch((err) => {
          throw err;
        });
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/date/:date', (req, res) => {
  let regex = "^" + req.params.date;
  Event.find({ startDate: new RegExp(regex, "g") })
    .then((events) => {
      if (events.length == 0) {
        return res.status(200).json({ message: "No events found on this date" });
      }
      return res.json(events);
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/', passport.authenticate('jwt', { session: false }), params.checkParameters(["title", "location", "startDate"]), (req, res) => {
  const newEvent = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    time: req.body.time,
    bands: req.body.bands
  }
  new Event(newEvent)
    .save()
    .then(() => {
      return res.status(200).json({ message: "Event saved" })
    })
    .catch((err) => {
      throw err;
    });
});

router.put('/:_id', passport.authenticate('jwt', { session: false }), params.checkParameters(["title", "location", "startDate"]), (req, res) => {
  const id = { _id: req.params._id };
  const update = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    time: req.body.time,
    bands: req.body.bands
  };
  Event.findOneAndUpdate(id, update, (err, event) => {
    if (err) throw err;
    return  res.status(200).json({ message: "Event updated" });
  });
});

router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Event.remove(id, (err, event) => {
    if (err) throw err;
    return res.status(200).json({ message: "Event deleted" });
  });
});

module.exports = router;