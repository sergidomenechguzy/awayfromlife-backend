const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// load user model
require('../models/User');
const User = mongoose.model('users');

//load secrets
const secrets = require('../secrets.js');

// events
router.post('/login', (req, res) => {
  const decodedToken = jwt.verify(req.body.token, secrets.frontEndSecret);
  const email = decodedToken.email;
  const password = decodedToken.password;

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        res.status(401).json({ message: "wrong email or password" });
      }
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          const payload = {
            id: user.id,
            expire: Date.now() + 7200000
          };
          const token = jwt.sign(payload, secrets.authSecret);
          res.json({ message: "ok", token: token });
        } else {
          res.status(401).json({ message: "wrong email or password" });
        }
      })
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/register', (req, res) => {
  const decodedToken = jwt.verify(req.body.token, secrets.frontEndSecret);
  const newUser = new User({
    name: decodedToken.name,
    email: decodedToken.email,
    password: decodedToken.password
  });

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if (err) throw err;
      newUser.password = hash;
      newUser.save()
        .then(res.send('registered'))
        .catch((err) => {
          throw err;
        });
    });
  });
});

router.get('/auth', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.send('You are authorized');
});

module.exports = router;
