const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load params
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');

// locations routes
// get all locations
router.get('/', token.checkToken(false), (req, res) => {
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
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get paginated locations
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = ['name'];
	if (req.query.sortBy === 'address.street' || req.query.sortBy === 'address.city') sortBy = req.query.sortBy.split('.');

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
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get location by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
			}
			return res.status(200).json({ data: location, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get events by location id
router.get('/events/:_id', token.checkToken(false), (req, res) => {
	Event.find({ location: req.params._id })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found for this location', token: res.locals.token });
			}
			dereference.eventObjectArray(events, 'startDate', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get locations by name
router.get('/name/:name', token.checkToken(false), (req, res) => {
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
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all locations in one city
router.get('/city/:city', token.checkToken(false), (req, res) => {
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
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all cities with saved locations
router.get('/cities', token.checkToken(false), (req, res) => {
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
			cities.sort((a, b) => {
				return a.localeCompare(b);
			});
			return res.status(200).json({ data: cities, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post location to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
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
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// update location by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
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
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Location updated', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete location by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) {
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
			}
			Location.remove({ _id: req.params._id }, (err, location) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Location deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;
