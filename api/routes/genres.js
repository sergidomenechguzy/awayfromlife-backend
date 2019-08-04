const express = require('express');
const mongoose = require('mongoose');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const token = require('../helpers/token');
const validateGenre = require('../helpers/validateGenre');
require('../models/Genre');

const router = express.Router();

const Genre = mongoose.model('genres');

// genres routes
// get all genres
router.get('/', token.checkToken(false), async (req, res) => {
  try {
    const genres = await Genre.find();
    if (genres.length === 0) {
      return res.status(200).json({ message: 'No genres found', token: res.locals.token });
    }

    genres.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    return res.status(200).json({ data: genres, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added genres
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('genre', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post genre to database
router.post('/', token.checkToken(true), validateGenre.validateObject('post'), async (req, res) => {
  try {
    await new Genre(res.locals.validated).save();
    return res.status(200).json({ message: 'Genre saved', token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post multiple genres to database
router.post('/multiple', token.checkToken(true), validateGenre.validateList(), async (req, res) => {
  try {
    const objectList = res.locals.validated;
    const promises = objectList.map(async object => {
      const result = await new Genre(object).save();
      return result;
    });
    const responseList = await Promise.all(promises);
    return res
      .status(200)
      .json({ message: `${responseList.length} genre(s) saved`, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// update genre by id
router.put(
  '/:_id',
  token.checkToken(true),
  validateGenre.validateObject('put'),
  async (req, res) => {
    try {
      const updated = await Genre.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, {
        new: true,
      });
      return res
        .status(200)
        .json({ message: 'Genre updated', data: updated, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete genre by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'genre');
    return res.status(response.status).json({ message: response.message, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
