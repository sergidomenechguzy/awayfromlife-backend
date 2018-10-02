const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load location model
require('../models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load validateLocation.js
const validateLocation = require('../helpers/validateLocation');

// unvalidated_locations routes
// get all locations
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedLocations = await UnvalidatedLocation.find();
		if (unvalidatedLocations.length === 0)
			return res.status(200).json({ message: 'No locations found', token: res.locals.token });

			unvalidatedLocations.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});
		return res.status(200).json({ data: unvalidatedLocations, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get paginated locations
router.get('/page', token.checkToken(true), async (req, res) => {
	try {
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

		const locations = await UnvalidatedLocation.find(query);
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
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get location by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedLocation.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No location with this ID', token: res.locals.token });

		return res.status(200).json({ data: object, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all filter data
router.get('/filters', token.checkToken(true), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			cities: [],
			countries: []
		};
		const unvalidatedLocations = await UnvalidatedLocation.find();
		if (unvalidatedLocations.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		unvalidatedLocations.forEach(location => {
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
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post location to database
router.post('/', token.checkToken(false), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), validateLocation.validateObject('unvalidated'), async (req, res) => {
	try {
		await new UnvalidatedLocation(res.locals.validated).save();
		return res.status(200).json({ message: 'Location saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// validate unvalidated location
router.post('/validate/:_id', token.checkToken(true), params.checkParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), validateLocation.validateObject('validate'), async (req, res) => {
	try {
		await new Location(res.locals.validated).save();
		await UnvalidatedLocation.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Location validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// post multiple locations to database
router.post('/multiple', token.checkToken(false), params.checkListParameters(['name', 'address.street', 'address.city', 'address.country', 'address.lat', 'address.lng']), validateLocation.validateList('unvalidated'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new UnvalidatedLocation(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' location(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete location by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidLocation');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

module.exports = router;