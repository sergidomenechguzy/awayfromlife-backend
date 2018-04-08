const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load params
const params = require('../config/params.js');
// load token.js
const token = require('../config/token');

// bands routes
// get all bands
router.get('/', token.checkToken(), (req, res) => {
	Band.find()
		.collation({ locale: "en", strength: 2 })
		.sort({name: 1})
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });
			}
			return res.status(200).json({ data: bands, token: res.locals.token });
		})
		.catch((err) => {
			throw err;
		});
});

// get paginated bands
router.get('/page', token.checkToken(), (req, res) => {
	const perPage = (parseInt(req.query.perPage)) || 10;
	const page = (parseInt(req.query.page)) || 1;
	const sortBy = (req.query.sortBy) || 'name';
	const order = (parseInt(req.query.order)) || 1;
	Band.find()
		.collation({ locale: "en", strength: 2 })
		.sort({[sortBy]: order})
		.skip((perPage * page) - perPage)
		.limit(perPage)
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });
			}
			Band.count().then((count) => {
				return res.status(200).json({ data: bands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
			}).catch((err) => {
				throw err;
			});
		})
		.catch((err) => {
			throw err;
		});
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(), (req, res) => {
	let regex = '.*' + req.params.genre + '.*';
	Band.find({ genre: new RegExp(regex, 'gi') })
		.collation({ locale: "en", strength: 2 })
		.sort({name: 1})
		.then((bands) => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found with this genre', token: res.locals.token });
			}
			return res.status(200).json({ data: bands, token: res.locals.token });
		})
		.catch((err) => {
			throw err;
		});
});

// post band to database
router.post('/', passport.authenticate('jwt', { session: false }), params.checkParameters(['name', 'genre']), (req, res) => {
	const newBand = {
		name: req.body.name,
		genre: req.body.genre,
		origin: req.body.origin,
		history: req.body.history,
		label: req.body.label,
		releases: req.body.releases,
		foundingDate: req.body.foundingDate,
		websiteUrl: req.body.websiteUrl,
		bandcampUrl: req.body.bandcampUrl,
		soundcloudUrl: req.body.soundcloudUrl,
		facebookUrl: req.body.facebookUrl
	}
	new Band(newBand)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Band saved', token: token.signJWT(req.user.id) })
		})
		.catch((err) => {
			throw err;
		});
});

// update band by id
router.put('/:_id', passport.authenticate('jwt', { session: false }), params.checkParameters(['name', 'genre']), (req, res) => {
	const id = { _id: req.params._id };
	const update = {
		name: req.body.name,
		genre: req.body.genre,
		origin: req.body.origin,
		history: req.body.history,
		label: req.body.label,
		releases: req.body.releases,
		foundingDate: req.body.foundingDate,
		websiteUrl: req.body.websiteUrl,
		bandcampUrl: req.body.bandcampUrl,
		soundcloudUrl: req.body.soundcloudUrl,
		facebookUrl: req.body.facebookUrl
	};
	Band.findOneAndUpdate(id, update, (err, band) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Band updated', token: token.signJWT(req.user.id) });
	});
});

// delete band by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Band.remove(id, (err, band) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Band deleted', token: token.signJWT(req.user.id) });
	});
});

module.exports = router;