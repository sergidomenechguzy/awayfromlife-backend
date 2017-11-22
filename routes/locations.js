const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// locations routes
router.get('/', (req, res) => {
  Location.find()
    .then(locations => {
      res.json(locations);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Location.findOne(id)
    .then(location => {
      res.json(location);
    })
    .catch((err) => {
      throw err;
    });
});

router.get('/name/:name', (req, res) => {
  let regex = ".*" + req.params.name + ".*";
  Event.find({ name: new RegExp(regex, "gi") })
    .then((locations) => {
      res.json(locations);
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
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
    .then(res.send('saved'))
    .catch((err) => {
      throw err;
    });
});

router.put('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  const update = {
    name: req.body.name,
    address: req.body.address,
    status: req.body.status,
    city: req.body.city,
    email: req.body.email,
    information: req.body.information,
    website: req.body.website,
    facebook_page_url: req.body.facebook_page_url
  };
  Location.findOneAndUpdate(id, update, {}, (err, location) => {
    if (err) throw err;
    res.json('updated');
  });
});

router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = { _id: req.params._id };
  Location.remove(id, (err, location) => {
    if (err) throw err;
    res.json('deleted');
  });
});

module.exports = router;