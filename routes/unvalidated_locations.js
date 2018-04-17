const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('unvalidated_locations');

// load params
const params = require('../config/params.js');
// load token.js
const token = require('../config/token');

// unvalidated_locations routes
// get all locations
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	Location.find()
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found', token: token.signJWT(req.user.id) });
			}
			locations.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: locations, token: token.signJWT(req.user.id) });
		})
		.catch(err => {
			throw err;
		});
});

// get paginated locations
router.get('/page', passport.authenticate('jwt', { session: false }), (req, res) => {
	const perPage = (parseInt(req.query.perPage)) || 10;
	const page = (parseInt(req.query.page)) || 1;
	const sortBy = (req.query.sortBy) || 'name';
	
	let order = 1
	if (parseInt(req.query.order) === -1) order = -1;
	
	Location.find()
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found', token: token.signJWT(req.user.id) });
			}

			locations.sort((a, b) => {
				if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
				return a[sortBy].localeCompare(b[sortBy]);
			});
			locations = locations.slice((perPage * page) - perPage, (perPage * page));

			Location.count()
				.then(count => {
					return res.status(200).json({ data: locations, current: page, pages: Math.ceil(count / perPage), token: token.signJWT(req.user.id) });
				})
				.catch(err => {
					throw err;
				});
		})
		.catch(err => {
			throw err;
		});
});

// get location by id
router.get('/byid/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: token.signJWT(req.user.id) });
			}
			return res.status(200).json({ data: location, token: token.signJWT(req.user.id) });
		})
		.catch(err => {
			throw err;
		});
});

// post location to database
router.post('/', token.checkToken(), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
	const newLocation = {
		name: req.body.name,
		address: {
			street: req.body.address.street,
			administrative: req.body.address.administrative,
			city: req.body.address.city,
			country: req.body.address.country,
			postcode: req.body.address.postcode,
			lat: req.body.address.lat,
			lng: req.body.address.lng,
			value: req.body.address.value
		},
		status: req.body.status,
		information: req.body.information,
		website: req.body.website,
		facebook_page_url: req.body.facebook_page_url
	};
	new Location(newLocation)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Location saved', token: res.locals.token })
		})
		.catch(err => {
			throw err;
		});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: token.signJWT(req.user.id) });
			}
			Location.remove({ _id: req.params._id }, (err, location) => {
				if (err) throw err;
				return res.status(200).json({ message: 'Location deleted', token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

module.exports = router;