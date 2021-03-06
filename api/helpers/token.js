/* eslint curly: "error" */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const uuidv4 = require('uuid/v4');

const secrets = require('../config/secrets');
require('../models/User');

const User = mongoose.model('users');

const expTime = 20 * 60;

// signs jwt with given user id
function signJWT(userID, sessionID) {
  return jwt.sign(
    { userID, sessionID, exp: Math.floor(Date.now() / 1000) + expTime },
    secrets.authSecret
  );
}

function createSession() {
  return {
    sessionID: uuidv4(),
    expireTime: Math.floor(Date.now() / 1000) + expTime,
  };
}

function checkToken(forbidden) {
  return (req, res, next) => {
    if (!req.headers.authorization || req.headers.authorization.split(' ')[0] !== 'JWT') {
      if (forbidden) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      return next();
    }
    jwt.verify(
      req.headers.authorization.split(' ')[1],
      secrets.authSecret,
      async (error, decodedAuthToken) => {
        if (error) {
          return res.status(400).json({ message: 'Invalid token' });
        }

        try {
          const user = await User.findById(decodedAuthToken.userID);
          if (!user) {
            if (forbidden) {
              return res.status(401).json({ message: 'Unauthorized' });
            }
            return next();
          }

          let sessionIndex;
          if (
            !user.currentSessions.some((session, index) => {
              if (
                session.sessionID === decodedAuthToken.sessionID &&
                session.expireTime > Math.floor(Date.now() / 1000)
              ) {
                sessionIndex = index;
                return true;
              }
              return false;
            })
          ) {
            if (forbidden) {
              return res.status(401).json({ message: 'Unauthorized' });
            }
            return next();
          }

          const exp = Math.floor(Date.now() / 1000) + expTime;
          user.currentSessions[sessionIndex].expireTime = exp;
          await User.findOneAndUpdate({ _id: decodedAuthToken.userID }, user);

          res.locals.token = jwt.sign(
            { userID: decodedAuthToken.userID, sessionID: decodedAuthToken.sessionID, exp },
            secrets.authSecret
          );
          return next();
        } catch (err) {
          console.log(err);
          return res.status(500).json({
            message: 'Error, something went wrong. Please try again.',
            error: `${err.name}: ${err.message}`,
          });
        }
      }
    );
  };
}

module.exports = {
  expTime,
  signJWT,
  createSession,
  checkToken,
};
