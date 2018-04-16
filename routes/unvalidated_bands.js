const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('unvalidated_bands');

// load params
const params = require('../config/params.js');
// load token.js
const token = require('../config/token');

// unvalidated_bands routes
// get all bands
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	Band.find()
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found', token: token.signJWT(req.user.id) });
			}
			bands.sort((a, b) => {
				return a.title.localeCompare(b.title);
			});
			return res.status(200).json({ data: bands, token: token.signJWT(req.user.id) });
		})
		.catch(err => {
			throw err;
		});
});

// get paginated bands
router.get('/page', passport.authenticate('jwt', { session: false }), (req, res) => {
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
				return res.status(200).json({ message: 'No bands found', token: token.signJWT(req.user.id) });
			}
			Band.count()
				.then(count => {
					return res.status(200).json({ data: bands, current: page, pages: Math.ceil(count / perPage), token: token.signJWT(req.user.id) });
				})
				.catch(err => {
					throw err;
				});
		})
		.catch(err => {
			throw err;
		});
});

// get band by id
router.get('/byid/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Band.findOne({ _id: req.params._id })
		.then(band => {
			if (!band) {
				return res.status(200).json({ message: 'No Band found with this ID', token: token.signJWT(req.user.id) });
			}
			return res.status(200).json({ data: band, token: token.signJWT(req.user.id) });
		})
		.catch(err => {
			throw err;
		});
});

// post band to database
router.post('/', token.checkToken(), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), (req, res) => {
	const newBand = {
		name: req.body.name,
		genre: req.body.genre,
		origin: {
			name: req.body.origin.name,
			administrative: req.body.origin.administrative,
			country: req.body.origin.country,
			postcode: req.body.origin.postcode,
			lat: req.body.origin.lat,
			lng: req.body.origin.lng,
			value: req.body.origin.value
		},
		history: req.body.history,
		label: req.body.label,
		releases: req.body.releases,
		foundingDate: req.body.foundingDate,
		websiteUrl: req.body.websiteUrl,
		bandcampUrl: req.body.bandcampUrl,
		soundcloudUrl: req.body.soundcloudUrl,
		facebookUrl: req.body.facebookUrl
	};
	new Band(newBand)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Band saved', token: res.locals.token })
		})
		.catch(err => {
			throw err;
		});
});

// delete band by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Band.remove({ _id: req.params._id }, (err, band) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Band deleted', token: token.signJWT(req.user.id) });
	});
});

module.exports = router;