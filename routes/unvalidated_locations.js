const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('unvalidated_locations');

// unvalidated_locations routes
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
  Location.find()
    .then(locations => {
      res.json(locations);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Location.findOne(id)
    .then(location => {
      res.json(location);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/name/:name', passport.authenticate('jwt', { session: false }), (req, res) => {
  let regex = ".*" + req.params.name + ".*";
  Event.find({ name: new RegExp(regex, "gi") })
    .then((locations) => {
      res.json(locations);
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/', (req, res) => {
  const newLocation = {
    name: req.body.name,
    address: req.body.address,
    status: req.body.status,
    city: req.body.city,
    email: req.body.email,
    information: req.body.information,
    website: req.body.website,
    facebook_page_url: req.body.facebook_page_url
  };
  new Location(newLocation)
    .save()
    .then(res.status(200).json({ message: "Location saved" }))
    .catch((err) => {
      throw err;
    });
});

router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Location.remove(id, (err, location) => {
    if (err) throw err;
    res.status(200).json({ message: "Location deleted" });
  });
});

module.exports = router;