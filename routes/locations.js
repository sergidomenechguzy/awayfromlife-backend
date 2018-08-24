const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load url.js
const url = require('../config/url');

// locations routes
// get all locations
router.get('/', token.checkToken(false), (req, res) => {
	Location.find()
		.then(locations => {
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });
			
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

	let order = 1;
	if (parseInt(req.query.order) === -1) order = -1;

	let query = {};
	if (req.query.startWith && /^[a-zA-Z#]$/.test(req.query.startWith)) {
		if (req.query.startWith === '#') query.name = new RegExp('^[^a-zäÄöÖüÜ]', 'i');
		else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = new RegExp('^[' + req.query.startWith + 'äÄ]', 'i');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = new RegExp('^[' + req.query.startWith + 'öÖ]', 'i');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = new RegExp('^[' + req.query.startWith + 'üÜ]', 'i');
		else query.name = new RegExp('^' + req.query.startWith, 'i');
	}
	if (req.query.city) {
		query.$or = [
			{ 'address.city': new RegExp(req.query.city, 'i') }, 
			{ 'address.county': new RegExp(req.query.city, 'i') }
		];
	}
	else if (req.query.country) {
		const countryString = 'address.country';
		query[countryString] = RegExp(req.query.country, 'i');
	}

	Location.find(query)
		.then(locations => {
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });

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
			if (!location) 
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
			
			return res.status(200).json({ data: location, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get location by name-url
router.get('/byurl/:url', token.checkToken(false), (req, res) => {
	Location.findOne({ url: req.params.url })
		.then(location => {
			if (!location) 
				return res.status(400).json({ message: 'No location found with this URL', token: res.locals.token });
			
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
			if (events.length === 0) 
				return res.status(200).json({ message: 'No events found for this location', token: res.locals.token });
			
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
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No location found with this name', token: res.locals.token });
			
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
	Location.find({ $or: [{ 'address.city': new RegExp(regex, 'gi') }, { 'address.county': new RegExp(regex, 'gi') }] })
		.then(locations => {
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No locations found in this city', token: res.locals.token });
			
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
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No locations found', token: res.locals.token });
			
			locations.forEach(location => {
				if (cities.indexOf(location.address.city) === -1) 
					cities.push(location.address.city);
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

// get similar locations
router.get('/similar', token.checkToken(false), (req, res) => {
	let query = {};
	if (req.query.name && req.query.city) {
		if (req.query.address) {
			query = { $or: [
				{
					name: new RegExp('^' + req.query.name + '$', 'i'),
					'address.city': new RegExp('^' + req.query.city + '$', 'i')
				},
				{ 'address.street': new RegExp('^' + req.query.address + '$', 'i') }
			] };
		}
		else {
			query.name = new RegExp('^' + req.query.name + '$', 'i');
			const cityString = 'address.city';
			query[cityString] = new RegExp('^' + req.query.city + '$', 'i');
		}
	}
	else {
		if (req.query.address) {
			const addressString = 'address.street';
			query[addressString] = new RegExp('^' + req.query.address + '$', 'i');
		}
		else {
			return res.status(400).json({ message: 'Parameter(s) missing: address or name and city are required.' });
		}
	}

	Location.find(query)
		.then(locations => {
			if (locations.length === 0) 
				return res.status(200).json({ message: 'No locations found with this name from this country.', token: res.locals.token });
			
			return res.status(200).json({ data: locations, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all filter data
router.get('/filters', token.checkToken(false), (req, res) => {
	let filters = {
		startWith: [],
		cities: [],
		countries: []
	};
	Location.find()
		.then(locations => {
			locations.forEach(location => {
				if (location.name && !filters.startWith.includes(location.name.charAt(0).toUpperCase())) {
					if (location.name.charAt(0).toUpperCase() === 'Ä') {
						if (!filters.startWith.includes('A')) filters.startWith.push('A');
					}
					else if (location.name.charAt(0).toUpperCase() === 'Ö') {
						if (!filters.startWith.includes('O')) filters.startWith.push('O');
					}
					else if (location.name.charAt(0).toUpperCase() === 'Ü') {
						if (!filters.startWith.includes('U')) filters.startWith.push('U');
					}
					else if (/[A-Z]/.test(location.name.charAt(0).toUpperCase())) 
						filters.startWith.push(location.name.charAt(0).toUpperCase());
					else if (!filters.startWith.includes('#')) 
						filters.startWith.push('#');
				}
				if (location.address.city && !filters.cities.includes(location.address.city)) 
					filters.cities.push(location.address.city);
				if (location.address.country && !filters.countries.includes(location.address.country)) 
					filters.countries.push(location.address.country);
			});
			filters.startWith.sort((a, b) => {
				return a.localeCompare(b);
			});
			filters.cities.sort((a, b) => {
				return a.localeCompare(b);
			});
			filters.countries.sort((a, b) => {
				return a.localeCompare(b);
			});
			return res.status(200).json({ data: filters, token: res.locals.token });
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
		url: req.body.name.split(' ').join('-'),
		address: {
			street: req.body.address.street,
			administrative: req.body.address.administrative,
			city: req.body.address.city,
			county: req.body.address.county,
			country: req.body.address.country,
			postcode: req.body.address.postcode,
			lat: req.body.address.lat,
			lng: req.body.address.lng,
			value: req.body.address.value
		},
		status: req.body.status,
		information: req.body.information,
		website: req.body.website,
		facebookUrl: req.body.facebookUrl
	};

	url.generateUrl(newLocation, Location, req.body.name.split(' ').join('-'), 2, (err, responseLocation) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		new Location(responseLocation)
			.save()
			.then(() => {
				return res.status(200).json({ message: 'Location saved', token: res.locals.token })
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// update location by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), (req, res) => {
	Location.findOne({ _id: req.params._id })
		.then(location => {
			if (!location) 
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });

			let update = {};
			update._id = req.params._id;
			update.name = req.body.name;
			update.url = req.body.name.split(' ').join('-');
			update.address = {};
			update.address.street = req.body.address.street;
			if (req.body.address.administrative) update.address.administrative = req.body.address.administrative;
			else if (location.address.administrative) update.address.administrative = location.address.administrative;
			update.address.city = req.body.address.city;
			if (req.body.address.county) update.address.county = req.body.address.county;
			else if (location.address.county) update.address.county = location.address.county;
			update.address.country = req.body.address.country;
			if (req.body.address.postcode) update.address.postcode = req.body.address.postcode;
			else if (location.address.postcode) update.address.postcode = location.address.postcode;
			update.address.lat = req.body.address.lat;
			update.address.lng = req.body.address.lng;
			if (req.body.address.value) update.address.value = req.body.address.value;
			else if (location.address.value) update.address.value = location.address.value;
			if (req.body.status) update.status = req.body.status;
			else if (location.status) update.status = location.status;
			else update.status = 'opened';
			if (req.body.information) update.information = req.body.information;
			else if (location.information) update.information = location.information;
			if (req.body.website) update.website = req.body.website;
			else if (location.website) update.website = location.website;
			if (req.body.facebookUrl) update.facebookUrl = req.body.facebookUrl;
			else if (location.facebookUrl) update.facebookUrl = location.facebookUrl;

			url.generateUrl(update, Location, req.body.name.split(' ').join('-'), 2, (err, responseLocation) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				Location.findOneAndUpdate({ _id: req.params._id }, responseLocation, (err, location) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					return res.status(200).json({ message: 'Location updated', token: res.locals.token });
				});
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
			if (!location) 
				return res.status(400).json({ message: 'No location found with this ID', token: res.locals.token });
			
			Location.remove({ _id: req.params._id }, (err, location) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				Event.remove({ location: req.params._id }, (err, location) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					}
					return res.status(200).json({ message: 'Location deleted', token: res.locals.token });
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;