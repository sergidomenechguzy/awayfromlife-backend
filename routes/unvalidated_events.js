const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load delete route
const deleteRoute = require('./controller/delete');

// load delete route
const latest = require('./controller/latest');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateEvent.js
const validateEvent = require('../helpers/validateEvent');

// unvalidated_events routes
// get all events
router.get('/', token.checkToken(true), async (req, res) => {
	try {
		const unvalidatedEvents = await UnvalidatedEvent.find();
		if (unvalidatedEvents.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedEvents, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get paginated events
router.get('/page', token.checkToken(false), async (req, res) => {
	try {
		let page = 1;

		let perPage = 20;
		if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

		let sortBy = 'name';
		if (req.query.sortBy === 'date' || req.query.sortBy === 'location') sortBy = req.query.sortBy;

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

		const events = await UnvalidatedEvent.find(query);
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const eventPromises = events.map(async (event) => {
			const matchedStartDate = req.query.startDate ? (event.date.localeCompare(req.query.startDate) >= 0) : true;
			const matchedEndDate = req.query.endDate ? (event.date.localeCompare(req.query.endDate) <= 0) : true;
			if (!(matchedStartDate && matchedEndDate))
				return null;

			if (req.query.city || req.query.country) {
				let locationQuery = { _id: event.location };
				if (req.query.city) {
					locationQuery.$or = [
						{ 'address.default.city': new RegExp(req.query.city, 'i') },
						{ 'address.default.administrative': new RegExp(req.query.city, 'i') },
						{ 'address.default.county': new RegExp(req.query.city, 'i') },
						{ 'address.international.city': new RegExp(req.query.city, 'i') }
					];
				}
				else {
					locationQuery.$or = [
						{ 'address.default.country': RegExp(req.query.country, 'i') },
						{ 'address.international.country': new RegExp(req.query.country, 'i') }
					];
				}
				const location = await Location.findOne(locationQuery);
				if (location == undefined)
					return null;
			}

			let dereferenced = await dereference.eventObject(event);
			if (req.query.genre) {
				const genreRegex = RegExp(req.query.genre, 'i');

				if (
					!dereferenced.bands.some(band => {
						return band.genre.some(genre => {
							return genreRegex.test(genre);
						});
					})
				)
					return null;
			}
			dereferenced.isFestival = false;
			return dereferenced;
		});
		let finalEvents = await Promise.all(eventPromises);
		finalEvents = finalEvents.filter(eventObject => eventObject != null);
		finalEvents = dereference.eventSort(finalEvents, sortBy, order);

		const count = finalEvents.length;
		if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

		finalEvents = finalEvents.slice((perPage * page) - perPage, (perPage * page));
		return res.status(200).json({ data: finalEvents, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get event by id
router.get('/byid/:_id', token.checkToken(true), async (req, res) => {
	try {
		const object = await UnvalidatedEvent.findById(req.params._id);
		if (!object)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		const dereferenced = await dereference.eventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get latest added events
router.get('/latest', token.checkToken(false), async (req, res) => {
	try {
		let count = 5;
		if (parseInt(req.query.count) === 10 || parseInt(req.query.count) === 20) count = parseInt(req.query.count);

		const latestObjects = await latest.get('unvalidatedEvent', count);
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
			countries: [],
			genres: [],
			firstDate: '',
			lastDate: ''
		};
		const unvalidatedEvents = await UnvalidatedEvent.find();
		if (unvalidatedEvents.length === 0)
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(unvalidatedEvents, 'event', 'date', 1);

		filters.firstDate = dereferenced[0].date;
		filters.lastDate = dereferenced[dereferenced.length - 1].date;

		dereferenced.forEach(event => {
			if (event.name && !filters.startWith.includes(event.name.charAt(0).toUpperCase())) {
				if (event.name.charAt(0).toUpperCase() === 'Ä') {
					if (!filters.startWith.includes('A')) filters.startWith.push('A');
				}
				else if (event.name.charAt(0).toUpperCase() === 'Ö') {
					if (!filters.startWith.includes('O')) filters.startWith.push('O');
				}
				else if (event.name.charAt(0).toUpperCase() === 'Ü') {
					if (!filters.startWith.includes('U')) filters.startWith.push('U');
				}
				else if (/[A-Z]/.test(event.name.charAt(0).toUpperCase()))
					filters.startWith.push(event.name.charAt(0).toUpperCase());
				else if (!filters.startWith.includes('#'))
					filters.startWith.push('#');
			}
			if (event.location.address.city && !filters.cities.includes(event.location.address.city))
				filters.cities.push(event.location.address.city);
			if (event.location.address.country && !filters.countries.includes(event.location.address.country))
				filters.countries.push(event.location.address.country);

			event.bands.forEach(band => {
				band.genre.forEach(genre => {
					if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
				});
			});
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
		filters.genres.sort((a, b) => {
			return a.localeCompare(b);
		});
		return res.status(200).json({ data: filters, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post event to database
router.post('/', token.checkToken(false), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('unvalidated', 'unvalidated'), async (req, res) => {
	try {
		await new UnvalidatedEvent(res.locals.validated).save();
		return res.status(200).json({ message: 'Event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// validate unvalidated event
router.post('/validate/:_id', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('validate', 'unvalidated'), async (req, res) => {
	try {
		if (!res.locals.validated.verifiable)
			return res.status(400).json({ message: 'Event cannot be validated. The location and all bands have to validated before.', token: res.locals.token });
		await new Event(res.locals.validated).save();
		await UnvalidatedEvent.remove({ _id: req.params._id });
		return res.status(200).json({ message: 'Event validated', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple events to database
router.post('/multiple', token.checkToken(false), params.checkListParameters(['name', 'location', 'date', 'bands']), validateEvent.validateList('unvalidated', 'unvalidated'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new UnvalidatedEvent(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		return res.status(200).json({ message: responseList.length + ' event(s) saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'unvalidEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;