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
  //Criteria variable
  const city = { city: req.params.city};
  //Array for all events of one city
  let cityEvents = [];
  
  var promise = new Promise(() => {
    //Get all locations which have the searched city as their city attribute
    Location.find(city)
    .then(locations => {
      console.log("cityEvents innerhalb äußere then", cityEvents);
      var tempCityEvents = [];
      //Iterate over all locations of the searched city
      locations.forEach((location) => {
        const id = { location: location._id};
        //get all events which have the location ID
        Event.find(id)
          .then(events => {
            //Iterate over all events and push them into the final array
            events.forEach((event) => {
              cityEvents.push(event);
            });
            console.log("cityEvents", cityEvents);
          });
      });
    });
  }).then(() => { //After all events are pushed to the array, return the array
    console.log("servusla");
    res.json(cityEvents);
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