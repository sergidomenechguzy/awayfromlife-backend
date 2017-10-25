const express = require('express');
const mongoose = require('mongoose');
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
      console.log(events);
      res.json(events);
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Event.findOne(id)
    .then(event => {
      res.json(event);
    });
});

router.get('/location/:_id', (req, res) => {
  const id = { location: req.params._id};
  Event.find(id)
    .then(events => {
      res.json(events);
    });
});

router.get('/city/:city', (req, res) => {
  const cityQuery = { city: req.params.city };
  var cityEvents = [];

  Event.find()
  .then((events) => {
    // console.log("ALL EVENTS OUTER", events);
    Location.find(cityQuery)
    .then((locations) => {
      // console.log("ALL EVENTS INNER", events);
      // console.log("ALL CITY LOCATIONS", locations);
      events.forEach((event) => {
        locations.forEach((location) => {
          // console.log("CURRENT EVENT", event);
          // console.log("CURRENT LOCATION", location);
          // console.log("CURRENT EVENTLIST", cityEvents);
          if (event.location == location._id) {
            cityEvents.push(event);
          }
        });
      });
      // console.log("CURRENT EVENTLIST", cityEvents);
    })
    .then(() => {
      res.json(cityEvents);
    });
  });

  
});

router.get('/month/:month', (req, res) => {
  let monthEvents = [];
  Event.find()
    .then(events => {
      events.forEach((event) => {
        if(event.date.getMonth() == req.params.month) {
          monthEvents.push(event);
        }
      });
      res.json(monthEvents);
    });
});

router.post('/', (req, res) => {
  new Event(req.body)
    .save()
    .then(res.send('saved'));
});

router.put('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  const update = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    date: req.body.date
  };
  Event.findOneAndUpdate(id, update, {}, (err, event) => {
    if(err) throw err;
    res.json(event);
  });
});

router.delete('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Event.remove(id, (err, event) => {
    if(err) throw err;
    res.json(event);
  });
});

module.exports = router;