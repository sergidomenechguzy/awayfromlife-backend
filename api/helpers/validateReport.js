const mongoose = require('mongoose');

require('../models/Event');
require('../models/Band');
require('../models/Location');
require('../models/Festival');

const Event = mongoose.model('events');
const Band = mongoose.model('bands');
const Location = mongoose.model('locations');
const Festival = mongoose.model('festivals');

// validate all attributes for report objects in the request body
const validateObject = () => {
  return async (req, res, next) => {
    try {
      if (
        !(
          req.body.category.toLowerCase() === 'event' ||
          req.body.category.toLowerCase() === 'location' ||
          req.body.category.toLowerCase() === 'band' ||
          req.body.category.toLowerCase() === 'festival'
        )
      ) {
        return res.status(400).json({
          message:
            "Attribute 'category' has to be either 'event', 'location', 'band' or 'festival' as a string.",
          token: res.locals.token,
        });
      }

      let itemId;
      if (!(typeof req.body.item === 'string' && req.body.item.length > 0)) {
        if (!(typeof req.body.item === 'object' && req.body.item._id !== undefined)) {
          return res.status(400).json({
            message:
              "Attribute 'item' has to be either the ID of one item from the specified category from the database or an object from the specified category with an _id attribute containing the ID of an item from the specified category from the database.",
            token: res.locals.token,
          });
        }
        itemId = req.body.item._id;
      } else {
        itemId = req.body.item;
      }

      if (!(req.body.description === undefined || typeof req.body.description === 'string')) {
        return res.status(400).json({
          message: "Attribute 'description' can be left out or has to be a string.",
          token: res.locals.token,
        });
      }

      const categories = {
        event: Event,
        location: Location,
        band: Band,
        festival: Festival,
      };

      const item = await categories[req.body.category.toLowerCase()].findById(itemId);
      if (!item) {
        return res.status(200).json({
          message: `No ${req.body.category.toLowerCase()} found with this ID.`,
          token: res.locals.token,
        });
      }

      const newReport = {
        category: req.body.category.toLowerCase(),
        item: itemId,
        description: req.body.description !== undefined ? req.body.description : '',
      };
      res.locals.validated = newReport;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  };
};

module.exports = {
  validateObject,
};
