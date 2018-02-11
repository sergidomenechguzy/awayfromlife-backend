const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('unvalidated_locations');

// load params
const params = require('../config/params.js');

// unvalidated_locations routes
// get all locations
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	Location.find()
		.collation({ locale: "en", strength: 2 })
		.sort({name: 1})
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found' });
			}
			return res.json(locations);
		})
		.catch((err) => {
			throw err;
		});
});

// get paginated locations
router.get('/page', passport.authenticate('jwt', { session: false }), (req, res) => {
	const perPage = (parseInt(req.query.perPage)) || 10;
	const page = (parseInt(req.query.page)) || 1;
	const sortBy = (req.query.sortBy) || 'name';
	const order = (parseInt(req.query.order)) || 1;
	Location.find()
		.collation({ locale: "en", strength: 2 })
		.sort({[sortBy]: order})
		.skip((perPage * page) - perPage)
		.limit(perPage)
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found' });
			}
			Location.count().then((count) => {
				return res.json({
					locations: locations,
					current: page,
					pages: Math.ceil(count / perPage)
				});
			}).catch((err) => {
				throw err;
			});
		})
		.catch((err) => {
			throw err;
		});
});

// get location by id
router.get('/byid/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Location.findOne(id)
		.then(location => {
			if (!location) {
				return res.status(200).json({ message: 'No location found with this ID' });
			}
			return res.json(location);
		})
		.catch((err) => {
			throw err;
		});
});

// get location by name
router.get('/name/:name', passport.authenticate('jwt', { session: false }), (req, res) => {
	let regex = '.*' + req.params.name + '.*';
	Location.find({ name: new RegExp(regex, 'gi') })
		.collation({ locale: "en", strength: 2 })
		.sort({name: 1})
		.then((locations) => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No location found with this name' });
			}
			return res.json(locations);
		})
		.catch((err) => {
			throw err;
		});
});

// post location to database
router.post('/', params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
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
			return res.status(200).json({ message: 'Location saved' })
		})
		.catch((err) => {
			throw err;
		});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Location.remove(id, (err, location) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Location deleted' });
	});
});

module.exports = router;