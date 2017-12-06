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
const secrets = require('../config/secrets.js');

// events
router.post('/login', (req, res) => {
  const decodedToken = jwt.verify(req.body.token, secrets.frontEndSecret);
  const email = decodedToken.email;
  const password = decodedToken.password;

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        res.status(401).json({ message: "Wrong email or password" });
      }
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          const payload = {
            id: user.id,
            expire: Date.now() + 7200000
          };
          const token = jwt.sign(payload, secrets.authSecret);
          res.status(200).json({ message: "You are logged in", token: token  });
        } else {
          res.status(401).json({ message: "Wrong email or password" });
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
        .then(res.status(200).json({ message: "User registered" }))
        .catch((err) => {
          throw err;
        });
    });
  });
});

router.post('/reset-password', passport.authenticate('jwt', { session: false }), (req, res) => {
  const decodedAuthToken = jwt.verify(req.headers.authorization.split(" ")[1], secrets.authSecret);
  if(!req.body.token) {
    res.status(401).json({ message: "Passwords missing" });
  }
  else {
    const decodedPasswordToken = jwt.verify(req.body.token, secrets.frontEndSecret);

    User.findOne({ _id: decodedAuthToken.id })
    .then(user => {
      if (!user) {
        res.status(401).json({ message: "An error occurred. Please try again." });
      }
      bcrypt.compare(decodedPasswordToken.oldPassword, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(decodedPasswordToken.newPassword, salt, (err, hash) => {
              if (err) throw err;
              User.findOneAndUpdate({ _id: decodedAuthToken.id }, { $set: { password: hash }, $set: { lastModified: Date.now() } }, (err, doc) => {
                if (err) throw err;
                const payload = {
                  id: user.id,
                  expire: Date.now() + 7200000
                };
                const token = jwt.sign(payload, secrets.authSecret);
                res.status(200).json({ message: "Password changed", token: token });
              });
            });
          });
        } else {
          res.status(401).json({ message: "Wrong password" });
        }
      })
    })
    .catch((err) => {
      throw err;
    });
  }
});

router.get('/auth', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.status(200).json({ message: "You are authorized" });
});

module.exports = router;
