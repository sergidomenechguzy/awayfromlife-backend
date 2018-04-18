const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load params
const params = require('../config/params.js');
// load token.js
const token = require('../config/token');

// locations routes
// get all locations
router.get('/', token.checkToken(), (req, res) => {
	Location.find()
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });
			}
			locations.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: locations, token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// get paginated locations
router.get('/page', token.checkToken(), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage)  === 5 || parseInt(req.query.perPage)  === 10 || parseInt(req.query.perPage)  === 50) perPage = parseInt(req.query.perPage);
	
	let sortBy = ['name'];
	if (req.query.sortBy  === 'address.street' || req.query.sortBy  === 'address.city') sortBy = req.query.sortBy.split('.');
	
	let order = 1
	if (parseInt(req.query.order) === -1) order = -1;
	
	Location.find()
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });
			}

			const count = locations.length;
			if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

			locations.sort((a, b) => {
				if (sortBy.length === 2) {
					if (order === -1) return b[sortBy[0]][sortBy[1]].localeCompare(a[sortBy[0]][sortBy[1]]);
					return a[sortBy[0]][sortBy[1]].localeCompare(b[sortBy[0]][sortBy[1]]);
				}
				if (order === -1) return b[sortBy[0]].localeCompare(a[sortBy[0]]);
				return a[sortBy[0]].localeCompare(b[sortBy[0]]);
			});
			locations = locations.slice((perPage * page) - perPage, (perPage * page));

			return res.status(200).json({ data: locations, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// get location by id
router.get('/byid/:_id', token.checkToken(), (req, res) => {
	console.log('_id: ', req.params._id);
	console.log('typeof: ', typeof req.params._id);
	
	Location.findOne({ _id: req.params._id })
		.then(location => {
			console.log(location);
			
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
			}
			return res.status(200).json({ data: location, token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// get locations by name
router.get('/name/:name', token.checkToken(), (req, res) => {
	let regex = '.*' + req.params.name + '.*';
	Location.find({ name: new RegExp(regex, 'gi') })
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No location found with this name', token: res.locals.token });
			}
			locations.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: locations, token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// get all locations in one city
router.get('/city/:city', token.checkToken(), (req, res) => {
	let regex = '.*' + req.params.city + '.*';
	Location.find({ 'address.city': new RegExp(regex, 'gi') })
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found in this city', token: res.locals.token });
			}
			locations.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: locations, token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// get all cities with saved locations
router.get('/cities', token.checkToken(), (req, res) => {
	let cities = [];
	Location.find()
		.then(locations => {
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });
			}
			locations.forEach(location => {
				if (cities.indexOf(location.address.city) === -1) {
					cities.push(location.address.city);
				}
			});
			locations.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: cities, token: res.locals.token });
		})
		.catch(err => {
			throw err;
		});
});

// post location to database
router.post('/', /*passport.authenticate('jwt', { session: false }),*/ params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
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
			return res.status(200).json({ message: 'Location saved'/*, token: token.signJWT(req.user.id)*/ })
		})
		.catch(err => {
			throw err;
		});
});

// update location by id
router.put('/:_id', passport.authenticate('jwt', { session: false }), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: token.signJWT(req.user.id) });
			}
			const update = {
				name: req.body.name,
				address: {
					street: req.body.address.street,
					administrative: req.body.address.administrative,
					city: req.body.address.city,
					country: req.body.address.country,
					postcode: req.body.address.postcode,
					lat: req.body.address.lat,
					lng: req.body.address.lng,
					value: req.body.address.value,
				},
				status: req.body.status,
				information: req.body.information,
				website: req.body.website,
				facebook_page_url: req.body.facebook_page_url
			};
			Location.findOneAndUpdate({ _id: req.params._id }, update, (err, location) => {
				if (err) throw err;
				return res.status(200).json({ message: 'Location updated', token: token.signJWT(req.user.id) });
			});
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
