const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');
// load validateGenre.js
const validateGenre = require('../helpers/validateGenre');

// genres routes
// get all genres
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const genres = await Genre.find();
		if (genres.length === 0)
			return res.status(200).json({ message: 'No genres found', token: res.locals.token });

		genres.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
		return res.status(200).json({ data: genres, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post genre to database
router.post('/', token.checkToken(true), params.checkParameters(['name']), validateGenre.validateObject('post'), async (req, res) => {
	try {
		await new Genre(res.locals.validated).save();
		return res.status(200).json({ message: 'Genre saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post multiple genres to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name']), validateGenre.validateList(), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new Genre(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' genre(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// update genre by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name']), validateGenre.validateObject('put'), async (req, res) => {
	try {
		await Genre.findOneAndUpdate({ _id: req.params._id }, res.locals.validated);
		return res.status(200).json({ message: 'Genre updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete genre by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'genre');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

module.exports = router;
