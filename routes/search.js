const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// search routes
router.get('/:query', (req, res) => {
  const regex = ".*" + req.params.query + ".*";
  let responseList = [];
  
  Event.find({ title: new RegExp(regex, "gi") })
  .then((events) => {
    events.forEach((event) => {
      const eventInformation = {
        category: "Event",
        title: event.title,
        id: event._id
      };
      responseList = responseList.concat(eventInformation);
    });
    
    Location.find({ name: new RegExp(regex, "gi") })
    .then((locations) => {
      locations.forEach((location) => {
        const locationInformation = {
          category: "Location",
          title: location.name,
          id: location._id
        };
        responseList = responseList.concat(locationInformation);
      });
      return res.json(responseList);
    })
    .catch((err) => {
      throw err;
    });
  })
  .catch((err) => {
    throw err;
  });
});

module.exports = router;