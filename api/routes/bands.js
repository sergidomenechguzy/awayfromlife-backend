const express = require('express');
const mongoose = require('mongoose');
const escapeStringRegexp = require('escape-string-regexp');

const deleteRoute = require('../routes/controller/delete');
const latest = require('../routes/controller/latest');
const pastAndUpcomingEventsRoute = require('../routes/controller/pastAndUpcomingEvents');
const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
const validateBand = require('../helpers/validateBand');
const csv = require('../helpers/csv');
const multerConfig = require('../config/multerConfig');
require('../models/Band');
require('../models/Genre');

const router = express.Router();

const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Genre = mongoose.model('genres');

// bands routes
// get all bands
router.get('/', token.checkToken(false), async (req, res) => {
  try {
    const bands = await Band.find();
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No bands found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all bands including unvalidated bands
router.get('/all', token.checkToken(false), async (req, res) => {
  try {
    const objects = await Band.find();
    const unvalidatedObjects = await UnvalidatedBand.find();
    if (objects.length === 0 && unvalidatedObjects.length === 0) {
      return res.status(200).json({ message: 'No bands found', token: res.locals.token });
    }

    let dereferenced = await dereference.objectArray(objects, 'band', false);
    let dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'band', false);

    dereferenced = dereferenced.map(object => ({ ...object, isValidated: true }));
    dereferencedUnvalidated = dereferencedUnvalidated.map(object => ({
      ...object,
      isValidated: false,
    }));

    let finalList = dereferenced.concat(dereferencedUnvalidated);
    finalList = dereference.bandSort(finalList, 'name', 1);

    return res.status(200).json({ data: finalList, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get paginated bands
router.get('/page', token.checkToken(false), async (req, res) => {
  try {
    let page = 1;

    let perPage = 20;
    if ([5, 10, 50].includes(parseInt(req.query.perPage, 10))) {
      perPage = parseInt(req.query.perPage, 10);
    }
    let sortBy = 'name';
    if (['genre', 'origin.city', 'lastModified'].includes(req.query.sortBy)) {
      sortBy = req.query.sortBy;
    }
    let order = 1;
    if (parseInt(req.query.order, 10) === -1) {
      order = -1;
    }

    const query = {};
    if (req.query.startWith && /^[a-z#]$/i.test(req.query.startWith)) {
      if (req.query.startWith === '#') {
        query.name = /^[^a-zäÄöÖüÜ]/i;
      } else if (['a', 'A'].includes(req.query.startWith)) {
        query.name = /^[aäÄ]/i;
      } else if (['o', 'O'].includes(req.query.startWith)) {
        query.name = /^[oöÖ]/i;
      } else if (['u', 'U'].includes(req.query.startWith)) {
        query.name = /^[uüÜ]/i;
      } else {
        query.name = new RegExp(`^${escapeStringRegexp(req.query.startWith.trim())}`, 'i');
      }
    }
    if (req.query.city) {
      const regexp = new RegExp(escapeStringRegexp(req.query.city.trim()), 'i');
      query.$or = [
        { 'origin.default.city': regexp },
        { 'origin.default.administrative': regexp },
        { 'origin.default.county': regexp },
        { 'origin.international.city': regexp },
      ];
    } else if (req.query.country) {
      const regexp = new RegExp(escapeStringRegexp(req.query.country.trim()), 'i');
      query.$or = [
        { 'origin.default.country': regexp },
        { 'origin.international.country': regexp },
      ];
    }
    if (req.query.label) {
      query.recordLabel = new RegExp(escapeStringRegexp(req.query.label.trim()), 'i');
    }

    const bands = await Band.find(query);
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No bands found', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', sortBy, order);

    let finalBands = [];
    if (req.query.genre) {
      const genreRegex = new RegExp(`^${escapeStringRegexp(req.query.genre.trim())}$`, 'i');
      dereferenced.forEach(band => {
        band.genre.some(genre => {
          if (genreRegex.test(genre)) {
            finalBands.push(band);
            return true;
          }
          return false;
        });
      });
    } else finalBands = dereferenced;

    const count = finalBands.length;
    if (
      parseInt(req.query.page, 10) > 0 &&
      parseInt(req.query.page, 10) <= Math.ceil(count / perPage)
    ) {
      page = parseInt(req.query.page, 10);
    }
    finalBands = finalBands.slice(perPage * page - perPage, perPage * page);

    return res.status(200).json({
      data: finalBands,
      current: page,
      pages: Math.ceil(count / perPage),
      token: res.locals.token,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get band by id
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
  try {
    const object = await Band.findById(req.params._id);
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No band found with this ID', token: res.locals.token });
    }

    const dereferenced = await dereference.bandObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get band by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
  try {
    const object = await Band.findOne({
      url: new RegExp(`^${escapeStringRegexp(req.params.url.trim())}$`, 'i'),
    });
    if (!object) {
      return res
        .status(400)
        .json({ message: 'No band found with this URL', token: res.locals.token });
    }

    const dereferenced = await dereference.bandObject(object);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all bands upcoming events
router.get('/:_id/upcomingEvents', token.checkToken(false), async (req, res) => {
  try {
    const events = await pastAndUpcomingEventsRoute.getEvents('upcoming', 'bands', req.params._id);
    if (typeof events === 'string') {
      return res.status(200).json({ message: events, token: res.locals.token });
    }
    return res.status(200).json({ data: events, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all bands past events
router.get('/:_id/pastEvents', token.checkToken(false), async (req, res) => {
  try {
    const events = await pastAndUpcomingEventsRoute.getEvents('past', 'bands', req.params._id);
    if (typeof events === 'string') {
      return res.status(200).json({ message: events, token: res.locals.token });
    }
    return res.status(200).json({ data: events, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get bands by name
router.get('/name/:name', token.checkToken(false), async (req, res) => {
  try {
    const bands = await Band.find({
      name: new RegExp(escapeStringRegexp(req.params.name.trim()), 'i'),
    });
    if (bands.length === 0) {
      return res
        .status(200)
        .json({ message: 'No band found with this name.', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(false), async (req, res) => {
  try {
    const regex = new RegExp(`^${escapeStringRegexp(req.params.genre.trim())}$`, 'i');
    const bands = await Band.find();
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No band found.', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    const genreBands = [];
    dereferenced.forEach(band => {
      band.genre.some(genre => {
        if (regex.test(genre)) {
          genreBands.push(band);
          return true;
        }
        return false;
      });
    });
    return res.status(200).json({ data: genreBands, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get latest added bands
router.get('/latest', token.checkToken(false), async (req, res) => {
  try {
    let count = 5;
    if ([10, 20].includes(parseInt(req.query.count, 10))) {
      count = parseInt(req.query.count, 10);
    }

    const latestObjects = await latest.get('band', count);
    return res.status(200).json({ data: latestObjects, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all genres
router.get('/genres', token.checkToken(false), async (req, res) => {
  try {
    const genreList = [];
    const bands = await Band.find();
    const genres = await Genre.find();

    genres.forEach(genre => {
      bands.some(band => {
        if (band.genre.includes(genre._id.toString())) {
          genreList.push(genre.name);
          return true;
        }
        return false;
      });
    });
    genreList.sort((a, b) => {
      return a.localeCompare(b);
    });
    return res.status(200).json({ data: genreList, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all labels
router.get('/labels', token.checkToken(false), async (req, res) => {
  try {
    const bands = await Band.find();
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No bands found', token: res.locals.token });
    }

    let labelList = bands.map(band => band.recordLabel);
    const uniqueLabels = new Set(labelList);
    labelList = Array.from(uniqueLabels);
    labelList.sort((a, b) => {
      return a.localeCompare(b);
    });
    return res.status(200).json({ data: labelList, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get similar bands
router.get('/similar', token.checkToken(false), async (req, res) => {
  try {
    if (!req.query.name || !req.query.country) {
      return res
        .status(400)
        .json({ message: 'Parameter(s) missing: name and country are required.' });
    }
    const query = {
      name: new RegExp(escapeStringRegexp(req.query.name.trim()), 'i'),
      $or: [
        { 'origin.default.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
        {
          'origin.international.country': new RegExp(
            escapeStringRegexp(req.query.country.trim()),
            'i'
          ),
        },
      ],
    };

    const bands = await Band.find(query);
    if (bands.length === 0) {
      return res.status(200).json({ message: 'No similar bands found.', token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    return res.status(200).json({ data: dereferenced, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get all filter data
router.get('/filters', token.checkToken(false), async (req, res) => {
  try {
    const filters = {
      startWith: [],
      genres: [],
      labels: [],
      cities: [],
      countries: [],
    };
    const bands = await Band.find();
    if (bands.length === 0) {
      return res.status(200).json({ data: filters, token: res.locals.token });
    }

    const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);
    dereferenced.forEach(band => {
      if (band.name && !filters.startWith.includes(band.name.charAt(0).toUpperCase())) {
        if (band.name.charAt(0).toUpperCase() === 'Ä') {
          if (!filters.startWith.includes('A')) {
            filters.startWith.push('A');
          }
        } else if (band.name.charAt(0).toUpperCase() === 'Ö') {
          if (!filters.startWith.includes('O')) {
            filters.startWith.push('O');
          }
        } else if (band.name.charAt(0).toUpperCase() === 'Ü') {
          if (!filters.startWith.includes('U')) {
            filters.startWith.push('U');
          }
        } else if (/[A-Z]/.test(band.name.charAt(0).toUpperCase())) {
          filters.startWith.push(band.name.charAt(0).toUpperCase());
        } else if (!filters.startWith.includes('#')) {
          filters.startWith.push('#');
        }
      }
      band.genre.forEach(genre => {
        if (genre && !filters.genres.includes(genre)) {
          filters.genres.push(genre);
        }
      });
      if (band.recordLabel && !filters.labels.includes(band.recordLabel)) {
        filters.labels.push(band.recordLabel);
      }
      if (band.origin.city && !filters.cities.includes(band.origin.city)) {
        filters.cities.push(band.origin.city);
      }
      if (band.origin.country && !filters.countries.includes(band.origin.country)) {
        filters.countries.push(band.origin.country);
      }
    });
    filters.startWith.sort((a, b) => {
      return a.localeCompare(b);
    });
    filters.genres.sort((a, b) => {
      return a.localeCompare(b);
    });
    filters.labels.sort((a, b) => {
      return a.localeCompare(b);
    });
    filters.cities.sort((a, b) => {
      return a.localeCompare(b);
    });
    filters.countries.sort((a, b) => {
      return a.localeCompare(b);
    });
    return res.status(200).json({ data: filters, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// post band to database
router.post(
  '/',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateBand.validateObject('post'),
  async (req, res) => {
    try {
      const newBand = await new Band(res.locals.validated).save();
      const dereferenced = await dereference.bandObject(newBand);
      return res
        .status(200)
        .json({ message: 'Band saved', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// post multiple bands to database
router.post(
  '/multiple',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateBand.validateList('post'),
  async (req, res) => {
    try {
      const objectList = res.locals.validated;
      const promises = objectList.map(async object => {
        const result = await new Band(object).save();
        return result;
      });
      const responseList = await Promise.all(promises);
      return res
        .status(200)
        .json({ message: `${responseList.length} band(s) saved`, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// convert incoming csv data to matching json
router.post(
  '/convertCSV',
  token.checkToken(false),
  multerConfig.uploadCSV.single('file'),
  async (req, res) => {
    try {
      const bands = await csv.convertFile(req.file, 'bands');
      return res.status(200).json({ data: bands, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// update band by id
router.put(
  '/:_id',
  token.checkToken(true),
  multerConfig.upload.single('image'),
  validateBand.validateObject('put'),
  async (req, res) => {
    try {
      const updated = await Band.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, {
        new: true,
      });
      const dereferenced = await dereference.bandObject(updated);
      return res
        .status(200)
        .json({ message: 'Band updated', data: dereferenced, token: res.locals.token });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  }
);

// delete band by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
  try {
    const response = await deleteRoute.deleteObject(req.params._id, 'band');
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
