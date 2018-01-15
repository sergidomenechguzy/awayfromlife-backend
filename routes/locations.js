const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load params
const params = require('../config/params.js');

// locations routes
// get all locations
router.get('/', (req, res) => {
	Location.find()
		.then(locations => {
			if (locations.length == 0) {
				return res.status(200).json({ message: "No locations found" });
			}
			return res.json(locations);
		})
		.catch((err) => {
			throw err;
		});
});

// get paginated locations
router.get('/:page/:perPage', (req, res) => {
	const perPage = (parseInt(req.params.perPage)) || 10;
	const page = (parseInt(req.params.page)) || 0;
	Location.find()
		.skip((perPage * page) - perPage)
		.limit(perPage)
		.then(locations => {
			if (locations.length == 0) {
				return res.status(200).json({ message: "No locations found" });
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
router.get('/:_id', (req, res) => {
	const id = { _id: req.params._id };
	Location.findOne(id)
		.then(location => {
			if (!location) {
				return res.status(200).json({ message: "No location found with this ID" });
			}
			return res.json(location);
		})
		.catch((err) => {
			throw err;
		});
});

// get location by name
router.get('/name/:name', (req, res) => {
	let regex = ".*" + req.params.name + ".*";
	Location.find({ name: new RegExp(regex, "gi") })
		.then((locations) => {
			if (locations.length == 0) {
				return res.status(200).json({ message: "No location found with this name" });
			}
			return res.json(locations);
		})
		.catch((err) => {
			throw err;
		});
});

// post location to database
router.post('/', passport.authenticate('jwt', { session: false }), params.checkParameters(["name", "address"]), (req, res) => {
	const newLocation = {
		name: req.body.name,
		address: req.body.address,
		status: req.body.status,
		city: req.body.city,
		email: req.body.email,
		information: req.body.information,
		website: req.body.website,
		facebook_page_url: req.body.facebook_page_url
	};
	new Location(newLocation)
		.save()
		.then(() => {
			return res.status(200).json({ message: "Location saved" })
		})
		.catch((err) => {
			throw err;
		});
});

// update location by id
router.put('/:_id', passport.authenticate('jwt', { session: false }), params.checkParameters(["name", "address"]), (req, res) => {
	const id = { _id: req.params._id };
	const update = {
		name: req.body.name,
		address: req.body.address,
		status: req.body.status,
		city: req.body.city,
		email: req.body.email,
		information: req.body.information,
		website: req.body.website,
		facebook_page_url: req.body.facebook_page_url
	};
	Location.findOneAndUpdate(id, update, (err, location) => {
		if (err) throw err;
		return res.status(200).json({ message: "Location updated" });
	});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Location.remove(id, (err, location) => {
		if (err) throw err;
		return res.status(200).json({ message: "Location deleted" });
	});
});

module.exports = router;
