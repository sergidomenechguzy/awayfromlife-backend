const rateLimit = require('express-rate-limit');

const userLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
});

const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20, // start blocking after 20 requests
});

module.exports = {
  userLimiter,
  dataLimiter,
};
