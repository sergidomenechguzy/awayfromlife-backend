const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load bug model
require('../models/Bug');
const Bug = mongoose.model('bugs');

// bugs routes
router.get('/', (req, res) => {
  Bug.find()
    .then(bugs => {
      res.json(bugs);
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/', (req, res) => {
  const newBug = {
    error: req.body.error,
    description: req.body.description,
    login: req.body.login
  };
  new Bug(newBug)
    .save()
    .then(res.status(200).json({ message: "Bug saved" }))
    .catch((err) => {
      throw err;
    });
});

router.delete('/:_id', (req, res) => {
  const id = { _id: req.params._id };
  Bug.remove(id, (err, bug) => {
    if (err) throw err;
    res.status(200).json({ message: "Bug deleted" });
  });
});

module.exports = router;
