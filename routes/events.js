const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// events routes
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

router.get('/location/:_id', (req, res) => {
  const id = { location: req.params._id };
  Event.find(id)
    .then(events => {
      res.json(events);
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

router.put('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  const update = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    time: req.body.time
  };
  Event.findOneAndUpdate(id, update, {}, (err, event) => {
    if (err) throw err;
    res.json('updated');
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