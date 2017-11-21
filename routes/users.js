const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// load user model
require('../models/User');
const User = mongoose.model('users');

// events
router.get('/', (req, res) => {
  User.find()
    .then(users => {
      res.json(users);
    });
});

router.post('/login', (req, res) => {
  const decodedToken = jwt.verify(req.body.token, 'currentFrontendSecret');
  const email = decodedToken.email;
  const password = decodedToken.password;

  User.findOne({email: email})
  .then(user => {
    if(!user) {
      res.status(401).json({message:"wrong email or password1"});
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const payload = {id: user.id};
        const token = jwt.sign(payload, 'superSecretSecret');
        res.json({message: "ok", token: token});
      } else {
        res.status(401).json({message:"wrong email or password2"});
      }
    })
  })
});

router.post('/register', (req, res) => {
  const decodedToken = jwt.verify(req.body.token, 'currentFrontendSecret');
  const newUser = new User({
    name: decodedToken.name,
    email: decodedToken.email,
    password: decodedToken.password
  });

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if(err) throw err;
      newUser.password = hash;
      newUser.save()
        .then(res.send('registered'));
    });
  });
});

router.get('/auth', passport.authenticate('jwt', {session: false}), (req, res) => {
  res.json('You are authorized');
});

module.exports = router;