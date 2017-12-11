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
  if (!req.body.token) {
    return res.status(400).json({ message: "Token missing" });
  }
  const decodedToken = jwt.verify(req.body.token, secrets.frontEndSecret);

  User.findOne({ email: decodedToken.email })
    .then(user => {
      if (!user) {
        return res.status(401).json({ message: "Wrong email or password" });
      }
      bcrypt.compare(decodedToken.password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (!isMatch) {
          return res.status(401).json({ message: "Wrong email or password" });
        }
        const payload = {
          id: user.id,
          expire: Date.now() + 7200000
        };
        const token = jwt.sign(payload, secrets.authSecret);
        res.status(200).json({ message: "You are logged in", token: token  });
      })
    })
    .catch((err) => {
      throw err;
    });
});

router.post('/register', (req, res) => {
  if (!req.body.token) {
    return res.status(400).json({ message: "Token missing" });
  }
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
    return res.status(400).json({ message: "Password-token missing" });
  }
  else {
    const decodedPasswordToken = jwt.verify(req.body.token, secrets.frontEndSecret);
    if (decodedPasswordToken.newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    User.findOne({ _id: decodedAuthToken.id })
    .then(user => {
      if (!user) {
        return res.status(400).json({ message: "An error occurred. Please try again." });
      }
      bcrypt.compare(decodedPasswordToken.oldPassword, user.password, (err, isMatch) => {
        if (err) throw err;
        if (!isMatch) {
          return res.status(400).json({ message: "Wrong password" });
        }
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(decodedPasswordToken.newPassword, salt, (err, hash) => {
            if (err) throw err;
            updatedUser = {
              _id: user._id,
              name: user.name,
              email: user.email,
              password: hash,
              lastModified: Date.now()
            }
            User.findOneAndUpdate({ _id: decodedAuthToken.id }, updatedUser, (err, doc) => {
              if (err) throw err;
              const payload = {
                id: user.id,
                expire: Date.now() + 7200000
              };
              const token = jwt.sign(payload, secrets.authSecret);
              return res.status(200).json({ message: "Password changed", token: token });
            });
          });
        });
      })
    })
    .catch((err) => {
      throw err;
    });
  }
});

router.get('/auth', passport.authenticate('jwt', { session: false }), (req, res) => {
  return res.status(200).json({ message: "You are authorized" });
});

router.post('/tokens', (req, res) => {
  const payloadRegister = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  };
  const tokenRegister = jwt.sign(payloadRegister, secrets.frontEndSecret);

  const payloadLogin = {
    email: req.body.email,
    password: req.body.password
  };
  const tokenLogin = jwt.sign(payloadLogin, secrets.frontEndSecret);

  const payloadPassword = {
    oldPassword: req.body.oldPassword,
    newPassword: req.body.newPassword
  };
  const tokenPassword = jwt.sign(payloadPassword, secrets.frontEndSecret);

  return res.status(200).json({ tokenRegister: tokenRegister, tokenLogin: tokenLogin, tokenPassword: tokenPassword});
});

module.exports = router;
