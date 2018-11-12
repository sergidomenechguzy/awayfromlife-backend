const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const moment = require('moment');

// load event model
require('../models/Event');
const ArchivedEvent = mongoose.model('archived_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load archive.js
const archive = require('../config/archive');
// load validateEvent.js
const validateEvent = require('../helpers/validateEvent');

// events routes
// get all events
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const events = await ArchivedEvent.find();
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
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

		const events = await ArchivedEvent.find(query);
		if (events.length == 0 && req.query.includeFestivals != 'true')
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

		if (req.query.includeFestivals == 'true') {
			let festivalQuery = {};
			if (req.query.city) {
				festivalQuery.$or = [
					{ 'address.default.city': new RegExp(req.query.city, 'i') },
					{ 'address.default.administrative': new RegExp(req.query.city, 'i') },
					{ 'address.default.county': new RegExp(req.query.city, 'i') },
					{ 'address.international.city': new RegExp(req.query.city, 'i') }
				];
			}
			else if (req.query.country) {
				festivalQuery.$or = [
					{ 'address.default.country': RegExp(req.query.country, 'i') },
					{ 'address.international.country': new RegExp(req.query.country, 'i') }
				];
			}
			let festivals = await Festival.find(festivalQuery);
			if (events.length == 0 && festivals.length == 0)
				return res.status(200).json({ message: 'No events found', token: res.locals.token });

			const dereferenced = await dereference.objectArray(festivals, 'festival', false, 1);

			let finalFestivalEvents = [];
			dereferenced.forEach((festival) => {
				if (req.query.genre) {
					const genreRegex = RegExp(req.query.genre, 'i');
					if (!festival.genre.some(genre => genreRegex.test(genre)))
						return null;
				}

				festival.events.forEach(event => {
					if (event.startDate.localeCompare(moment(Date.now()).format('YYYY-MM-DD')) >= 0)
						return;

					if (req.query.startWith && !query.name.test(event.name))
						return;

					if (req.query.startDate || req.query.endDate) {
						const matchedStartDate = req.query.startDate ? (event.startDate.localeCompare(req.query.startDate) >= 0) : true;
						const matchedEndDate = req.query.startDate ? (event.startDate.localeCompare(req.query.endDate) <= 0) : true;
						if (!(matchedStartDate && matchedEndDate))
							return;
					}
					let finalFestivalEvent = JSON.parse(JSON.stringify(event));
					finalFestivalEvent.url = festival.url;
					finalFestivalEvent.date = event.startDate;
					finalFestivalEvent.location = {
						name: festival.name,
						address: {
							city: festival.address.city
						}
					};
					finalFestivalEvent.isFestival = true;
					finalFestivalEvents.push(finalFestivalEvent);
				});
			});
			finalEvents = finalEvents.concat(finalFestivalEvents);
		}

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
router.get('/byid/:_id', token.checkToken(false), async (req, res) => {
	try {
		const object = await ArchivedEvent.findById(req.params._id);
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

// get event by name-url
router.get('/byurl/:url', token.checkToken(false), async (req, res) => {
	try {
		const object = await ArchivedEvent.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') });
		if (!object)
			return res.status(400).json({ message: 'No event found with this URL', token: res.locals.token });

		const dereferenced = await dereference.eventObject(object);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by name
router.get('/name/:name', token.checkToken(false), async (req, res) => {
	try {
		const events = await ArchivedEvent.find({ name: new RegExp(req.params.name, 'gi') });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found with this name.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by city
router.get('/city/:city', token.checkToken(false), async (req, res) => {
	try {
		const locations = await Location.find({ $or: [{ 'address.city': new RegExp(req.params.city, 'i') }, { 'address.county': new RegExp(req.params.city, 'i') }] });
		if (locations.length === 0)
			return res.status(200).json({ message: 'No locations found in this city.', token: res.locals.token });

		const promises = locations.map(async (location) => {
			let result = await ArchivedEvent.find({ location: location._id });
			if (!result) return [];
			return result;
		});
		let eventList = await Promise.all(promises);
		eventList = eventList.reduce((acc, val) => acc.concat(val), []);

		const dereferenced = await dereference.objectArray(eventList, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by date
router.get('/date/:date', token.checkToken(false), async (req, res) => {
	try {
		const events = await ArchivedEvent.find({ date: new RegExp('^' + req.params.date) });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found on this date.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get similar events
router.get('/similar', token.checkToken(false), async (req, res) => {
	try {
		if (!req.query.location || !req.query.date)
			return res.status(400).json({ message: 'Parameter(s) missing: location and date are required.' });
		let query = {};
		query.location = req.query.location;
		query.date = new RegExp('^' + req.query.date);

		const events = await ArchivedEvent.find(query);
		if (events.length === 0)
			return res.status(200).json({ message: 'No similar events found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get all filter data
router.get('/filters', token.checkToken(false), async (req, res) => {
	try {
		let filters = {
			startWith: [],
			cities: [],
			countries: [],
			genres: [],
			firstDate: '',
			lastDate: ''
		};
		const archivedEvents = await ArchivedEvent.find();
		if (archivedEvents.length == 0 && req.query.includeFestivals != 'true')
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(archivedEvents, 'event', 'date', 1);

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

		if (req.query.includeFestivals == 'true') {
			const festivals = await Festival.find();
			if (archivedEvents.length == 0 && festivals.length == 0)
				return res.status(200).json({ data: filters, token: res.locals.token });

			const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);

			dereferenced.forEach(festival => {
				let valid = false;
				festival.events.forEach(event => {
					if (event.startDate.localeCompare(moment(Date.now()).format('YYYY-MM-DD')) >= 0) {
						valid = true;
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
						if (!filters.firstDate || event.startDate.localeCompare(filters.firstDate) == -1)
							filters.firstDate = event.startDate;
						if (!filters.lastDate || event.startDate.localeCompare(filters.lastDate) == 1)
							filters.lastDate = event.startDate;
					}
				});
				if (valid == true) {
					if (festival.address.city && !filters.cities.includes(festival.address.city))
						filters.cities.push(festival.address.city);
					if (festival.address.country && !filters.countries.includes(festival.address.country))
						filters.countries.push(festival.address.country);

					festival.genre.forEach(genre => {
						if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
					});
				}
			});
		}

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

// move old events to archived events collection
router.get('/archive', token.checkToken(true), async (req, res) => {
	try {
		const archived = await archive.events();
		return res.status(200).json({ message: `${archived.length} event(s) moved to archive.`, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post event to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('post', 'archive'), async (req, res) => {
	try {
		await new ArchivedEvent(res.locals.validated).save();
		return res.status(200).json({ message: 'Event saved', token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple events to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'location', 'date', 'bands']), validateEvent.validateList('post', 'archive'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new ArchivedEvent(object).save();
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

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('put', 'archive'), async (req, res) => {
	try {
		const updated = await ArchivedEvent.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, { new: true });
		const dereferenced = await dereference.eventObject(updated);
		return res.status(200).json({ message: 'Event updated', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete location by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'archiveEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;