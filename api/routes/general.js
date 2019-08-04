const express = require('express');

const latest = require('../routes/controller/latest');
const token = require('../helpers/token');

const router = express.Router();

// get latest added events
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let allCategories = [
      'event',
      'archivedEvent',
      'location',
      'band',
      'festival',
      'festivalEvent',
      'genre',
    ];
    if (res.locals.token !== undefined) {
      allCategories = allCategories.concat([
        'unvalidatedEvent',
        'unvalidatedLocation',
        'unvalidatedBand',
        'unvalidatedFestival',
        'unvalidatedFestivalEvent',
        'bug',
        'feedback',
        'report',
      ]);
    }

    let categories = ['event', 'location', 'band', 'festivalEvent'];
    if (req.query.categories !== undefined) {
      const queryCategories = req.query.categories.split('_');
      const finalCategories = [];
      queryCategories.forEach(category => {
        if (allCategories.includes(category)) {
          if (!finalCategories.includes(category)) {
            finalCategories.push(category);
          }
        } else {
          return res.status(400).json({
            message: `Only '${allCategories.join(`', '`)}' allowed as categories.`,
            token: res.locals.token,
          });
        }
      });
      if (finalCategories.length > 0) {
        categories = finalCategories;
      }
    }

    let count = 5;
    if (parseInt(req.query.count, 10)) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.getMultiple(categories, count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
