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

router.post('/login2', (req, res) => {
  let email;
  let password;

  if(req.body.email && req.body.password) {
    email = req.body.email;
    password = req.body.password;
  }
  let unhashedPassword = password;
  User.findOne({email: email})
  .then(user => {
    if(!user) {
      res.status(401).json({message:"wrong email or password1"});
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const payload = {email: email, password: unhashedPassword};
        const token = jwt.sign(payload, 'currentFrontendSecret');
        const payload2 = {id: user.id};
        const token2 = jwt.sign(payload2, 'superSecretSecret');
        res.json({message: "ok", tokenLogin: token, tokenID: token2});
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