const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const escapeStringRegexp = require('escape-string-regexp');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load delete.js
const deleteRoute = require(dirPath + '/api/routes/controller/delete');
// load latest.js
const latest = require(dirPath + '/api/routes/controller/latest');
// load params.js
const params = require(dirPath + '/api/helpers/params');
// load token.js
const token = require(dirPath + '/api/helpers/token');
// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');
// load validateLocation.js
const validateLocation = require(dirPath + '/api/helpers/validateLocation');
// load multerConfig.js
const multerConfig = require(dirPath + '/api/config/multerConfig');
// load rateLimit.js
const rateLimit = require(dirPath + '/api/config/rateLimit');

// unvalidated_locations routes
// get all locations
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedLocations = await UnvalidatedLocation.find();
		if (unvalidatedLocations.length === 0)
			return res.status(200).json({ message: 'No locations found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedLocations, 'location', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
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
		if (req.query.startWith && /^[a-z#]$/i.test(req.query.startWith)) {
			if (req.query.startWith === '#') query.name = /^[^a-zäÄöÖüÜ]/i;
			else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = /^[aäÄ]/i;
			else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = /^[oöÖ]/i;
			else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = /^[uüÜ]/i;
			else query.name = new RegExp(`^${escapeStringRegexp(req.query.startWith.trim())}`, 'i');
		}
		if (req.query.city) {
			query.$or = [
				{ 'address.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
				{ 'address.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
			];
		}
		else if (req.query.country) {
			query.$or = [
				{ 'address.default.country': RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
				{ 'address.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
			];
		}

		const locations = await UnvalidatedLocation.find(query);
		if (locations.length === 0)
			return res.status(200).json({ message: 'No locations found', token: res.locals.token });

		const count = locations.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

		let dereferenced = await dereference.objectArray(locations, 'location', sortBy, order);
		dereferenced = dereferenced.slice((perPage * page) - perPage, (perPage * page));

		return res.status(200).json({ data: dereferenced, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get location by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedLocation.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No location with this ID', token: res.locals.token });

			const dereferenced = await dereference.locationObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added locations
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('location', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
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
			if (location.address.default.city && !filters.cities.includes(location.address.default.city))
				filters.cities.push(location.address.default.city);
			if (location.address.default.country && !filters.countries.includes(location.address.default.country))
				filters.countries.push(location.address.default.country);
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
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post location to database
router.post('/', rateLimit.dataLimiter, token.checkToken(false), multerConfig.upload.single('image'), validateLocation.validateObject('unvalidated'), async (req, res) => {
	try {
		const newLocation = await new UnvalidatedLocation(res.locals.validated).save();
		const dereferenced = await dereference.locationObject(newLocation);
		return res.status(200).json({ message: 'Location saved', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple locations to database
router.post('/multiple', rateLimit.dataLimiter, token.checkToken(false), multerConfig.upload.single('image'), validateLocation.validateList('unvalidated'), async (req, res) => {
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
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated location
router.post('/validate/:_id', token.checkToken(true), multerConfig.upload.single('image'), validateLocation.validateObject('validate'), async (req, res) => {
	try {
		const newLocation = await new Location(res.locals.validated).save();
		await Promise.all([
			deleteRoute.deleteLocationFromEventCollection(Event, req.params._id, newLocation._id),
			deleteRoute.deleteLocationFromEventCollection(ArchivedEvent, req.params._id, newLocation._id),
			deleteRoute.deleteLocationFromEventCollection(UnvalidatedEvent, req.params._id, newLocation._id)
		]);
		await UnvalidatedLocation.remove({ _id: req.params._id });
		const dereferenced = await dereference.locationObject(newLocation);
		return res.status(200).json({ message: 'Location validated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete location by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.deleteObject(req.params._id, 'unvalidatedLocation');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;