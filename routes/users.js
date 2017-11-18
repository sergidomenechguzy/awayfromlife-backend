const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const router = express.Router();

// load user model
require('../models/User');
const User = mongoose.model('users');

const jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = 'superSecretSecret';

const jwtOptionsFrontend = {};
jwtOptionsFrontend.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptionsFrontend.secretOrKey = 'currentFrontendSecret';

// events
router.get('/', (req, res) => {
  User.find()
    .then(users => {
      res.json(users);
    });
});

router.post('/login', (req, res) => {
  let email;
  let password;

  passport.use(new JwtStrategy(jwtOptionsFrontend, (jwt_payload, next) => {
    console.log('payload received', jwt_payload);
    email = jwt_payload.email;
    password = jwt_payload.passport;
  }));

  // if(req.body.email && req.body.password) {
  //   email = req.body.email;
  //   password = req.body.password;
  // }
  User.findOne({email: email})
  .then(user => {
    console.log(user);
    if(!user) {
      res.status(401).json({message:"wrong email or password1"});
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const payload = {id: user.id};
        const token = jwt.sign(payload, jwtOptions.secretOrKey);
        res.json({message: "ok", token: token});
      } else {
        res.status(401).json({message:"wrong email or password2"});
      }
    })
  })
});

router.post('/register', (req, res) => {
  const newUser = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
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