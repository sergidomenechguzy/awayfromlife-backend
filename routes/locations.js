const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// events
router.get('/', (req, res) => {
  Location.find()
    .then(locations => {
      res.json(locations);
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Location.findOne(id)
    .then(location => {
      res.json(location);
    });
});

router.get('/name/:name', (req, res) => {
  let regex = ".*" + req.params.name + ".*";
  Event.find({name: new RegExp(regex, "gi")})
  .then((locations) => {
    res.json(locations);
  });
});

router.post('/', (req, res) => {
  new Location(req.body)
    .save()
    .then(res.send('saved'));
});

router.put('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  const update = {
    name: req.body.name,
    address: req.body.address,
    city: req.body.city,
    email: req.body.email,
    information: req.body.information,
    website: req.body.website,
    facebook_page_url: req.body.facebook_page_url,
    status: req.body.status
  };
  Location.findOneAndUpdate(id, update, {}, (err, location) => {
    if(err) throw err;
    res.json(location);
  });
});

router.delete('/:_id', (req, res) => {
  const id = { _id: req.params._id};
  Location.remove(id, (err, location) => {
    if(err) throw err;
    res.json(location);
  });
});

module.exports = router;