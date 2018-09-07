const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load params.js
const params = require('../config/params.js');
// load token.js
const token = require('../config/token.js');

// genres routes
// get all genres
router.get('/', token.checkToken(false), (req, res) => {
	Genre.find()
		.then(genres => {
			if (genres.length === 0) 
				return res.status(200).json({ message: 'No genres found', token: res.locals.token });
			
			genres.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: genres, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post genre to database
router.post('/', token.checkToken(true), params.checkParameters(['name']), (req, res) => {
	const newGenre = {
		name: req.body.name
	};
	new Genre(newGenre)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Genre saved', token: res.locals.token })
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post multiple genres to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name']), (req, res) => {
	const genreList = req.body.list;
	let savedGenres = 0;
	genreList.forEach(genre => {
		const newGenre = {
			name: genre.name
		};
		new Genre(newGenre)
			.save()
			.then(() => {
				savedGenres++;
				if (genreList.length == savedGenres)
					return res.status(200).json({ message: savedGenres + ' genre(s) saved', token: res.locals.token });
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// update genre by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name']), (req, res) => {
	Genre.findOne({ _id: req.params._id })
		.then(genre => {
			if (!genre) 
				return res.status(400).json({ message: 'No genre found with this ID', token: res.locals.token });

			let update = {
				_id: req.params._id,
				name: req.body.name
			};

			Genre.findOneAndUpdate({ _id: req.params._id }, update, (err, genre) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Genre updated', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete genre by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Genre.findOne({ _id: req.params._id })
		.then(genre => {
			if (!genre) 
				return res.status(400).json({ message: 'No genre found with this ID', token: res.locals.token });
			Genre.remove({ _id: req.params._id }, (err, genre) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Genre deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
