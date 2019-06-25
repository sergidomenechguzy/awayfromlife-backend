const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const moment = require('moment');
const escapeStringRegexp = require('escape-string-regexp');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');

// load delete.js
const deleteRoute = require(dirPath + '/api/routes/controller/delete');
// load latest.js
const latest = require(dirPath + '/api/routes/controller/latest');
// load token.js
const token = require(dirPath + '/api/helpers/token');
// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');
// load validateEvent.js
const validateEvent = require(dirPath + '/api/helpers/validateEvent');
// load csv.js
const csv = require(dirPath + '/api/helpers/csv');
// load multerConfig.js
const multerConfig = require(dirPath + '/api/config/multerConfig');
// load rateLimit.js
const rateLimit = require(dirPath + '/api/config/rateLimit');

// events routes
// get all events
router.get('/', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find();
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

// get all events including unvalidated events
router.get('/all', token.checkToken(false), async (req, res) => {
	try {
		const objects = await Event.find();
		const unvalidatedObjects = await UnvalidatedEvent.find();
		if (objects.length === 0 && unvalidatedObjects.length === 0)
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		let dereferenced = await dereference.objectArray(objects, 'event', false);
		let dereferencedUnvalidated = await dereference.objectArray(unvalidatedObjects, 'event', false);

		dereferenced = dereferenced.map(object => {
			let update = JSON.parse(JSON.stringify(object));
			update.isValidated = true;
			return update;
		});
		dereferencedUnvalidated = dereferencedUnvalidated.map(object => {
			let update = JSON.parse(JSON.stringify(object));
			update.isValidated = false;
			return update;
		});

		let finalList = dereferenced.concat(dereferencedUnvalidated);
		finalList = dereference.eventSort(finalList, 'name', 1);

		return res.status(200).json({ data: finalList, token: res.locals.token });
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
		if (req.query.startWith && /^[a-z#]$/i.test(req.query.startWith)) {
			if (req.query.startWith === '#') query.name = /^[^a-zäÄöÖüÜ]/i;
			else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = /^[aäÄ]/i;
			else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = /^[oöÖ]/i;
			else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = /^[uüÜ]/i;
			else query.name = new RegExp(`^${escapeStringRegexp(req.query.startWith.trim())}`, 'i');
		}

		const events = await Event.find(query);
		if (events.length == 0 && req.query.includeFestivals != 'true')
			return res.status(200).json({ message: 'No events found', token: res.locals.token });

		const eventPromises = events.map(async (event) => {
			const matchedStartDate = req.query.startDate ? (new Date(event.date) >= new Date(req.query.startDate)) : true;
			const matchedEndDate = req.query.endDate ? (new Date(event.date) <= new Date(req.query.endDate)) : true;
			if (!(matchedStartDate && matchedEndDate))
				return null;

			if (req.query.city || req.query.country) {
				let locationQuery = { _id: event.location };
				if (req.query.city) {
					locationQuery.$or = [
						{ 'address.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
						{ 'address.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
						{ 'address.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
						{ 'address.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
					];
				}
				else {
					locationQuery.$or = [
						{ 'address.default.country': RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
						{ 'address.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
					];
				}
				const location = await Location.findOne(locationQuery);
				if (location == undefined)
					return null;
			}

			let dereferenced = await dereference.eventObject(event);
			if (req.query.genre) {
				const genreRegex = RegExp(`^${escapeStringRegexp(req.query.genre.trim())}$`, 'i');

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
					{ 'address.default.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
					{ 'address.default.administrative': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
					{ 'address.default.county': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') },
					{ 'address.international.city': new RegExp(escapeStringRegexp(req.query.city.trim()), 'i') }
				];
			}
			else if (req.query.country) {
				festivalQuery.$or = [
					{ 'address.default.country': RegExp(escapeStringRegexp(req.query.country.trim()), 'i') },
					{ 'address.international.country': new RegExp(escapeStringRegexp(req.query.country.trim()), 'i') }
				];
			}
			let festivals = await Festival.find(festivalQuery);
			if (events.length == 0 && festivals.length == 0)
				return res.status(200).json({ message: 'No events found', token: res.locals.token });

			const dereferenced = await dereference.objectArray(festivals, 'festival', false);

			let finalFestivalEvents = [];
			dereferenced.forEach((festival) => {
				if (req.query.genre) {
					const genreRegex = RegExp(`^${escapeStringRegexp(req.query.genre.trim())}$`, 'i');
					if (!festival.genre.some(genre => genreRegex.test(genre)))
						return null;
				}

				festival.events.forEach(event => {
					if (event.startDate.localeCompare(moment(Date.now()).format('YYYY-MM-DD')) < 0)
						return;

					if (req.query.startWith && !query.name.test(event.name))
						return;

					if (req.query.startDate || req.query.endDate) {
						const matchedStartDate = req.query.startDate ? (new Date(event.startDate) >= new Date(req.query.startDate)) : true;
						const matchedEndDate = req.query.endDate ? (new Date(event.startDate) <= new Date(req.query.endDate)) : true;
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
		let object = await Event.findById(req.params._id);
		let isArchived = false;

		if (!object && req.query.includeArchived == 'true') {
			object = await ArchivedEvent.findById(req.params._id);
			isArchived = true;
		}
		if (!object)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		let dereferenced = await dereference.eventObject(object);
		dereferenced.isArchived = isArchived;
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
		let object = await Event.findOne({ url: new RegExp(`^${escapeStringRegexp(req.params.url.trim())}$`, 'i') });
		let isArchived = false;

		if (!object && req.query.includeArchived == 'true') {
			object = await ArchivedEvent.findOne({ url: new RegExp(`^${escapeStringRegexp(req.params.url.trim())}$`, 'i') });
			isArchived = true;
		}
		if (!object)
			return res.status(400).json({ message: 'No event found with this URL', token: res.locals.token });

		let dereferenced = await dereference.eventObject(object);
		dereferenced.isArchived = isArchived;
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

		const latestObjects = await latest.get('event', count);
		return res.status(200).json({ data: latestObjects, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by name
router.get('/name/:name', token.checkToken(false), async (req, res) => {
	try {
		const events = await Event.find({ name: new RegExp(`^${escapeStringRegexp(req.params.name.trim())}$`, 'i') });
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
		const locations = await Location.find({ $or: [{ 'address.city': new RegExp(escapeStringRegexp(req.params.city.trim()), 'i') }, { 'address.county': new RegExp(escapeStringRegexp(req.params.city.trim()), 'i') }] });
		if (locations.length === 0)
			return res.status(200).json({ message: 'No locations found in this city.', token: res.locals.token });

		const promises = locations.map(async (location) => {
			let result = await Event.find({ location: location._id });
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

// get events by day
router.get('/day/:day', token.checkToken(false), async (req, res) => {
	try {
		if (!moment(req.params.day, 'YYYY-MM-DD', true).isValid())
			return res.status(400).json({ message: 'The date has to be in the format YYYY-MM-DD.' });
		const events = await Event.find({ date: new Date(req.params.day) });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found on this day.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get events by day
router.get('/month/:month', token.checkToken(false), async (req, res) => {
	try {
		if (!moment(req.params.month, 'YYYY-MM', true).isValid())
			return res.status(400).json({ message: 'The date has to be in the format YYYY-MM.' });
		const events = await Event.find({ date: { $gte: new Date(req.params.month), $lte: new Date(moment(req.params.month).add(1, 'months')) } });
		if (events.length === 0)
			return res.status(200).json({ message: 'No events found in this month.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);
		return res.status(200).json({ data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get canceled events
router.get('/canceled', token.checkToken(true), async (req, res) => {
	try {
		const events = await Event.find({ canceled: 1 });
		if (events.length === 0)
			return res.status(200).json({ message: 'No canceled events found.', token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);
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
		if (!moment(req.query.date, 'YYYY-MM-DD', true).isValid())
			return res.status(400).json({ message: 'The date has to be in the format YYYY-MM-DD.' });
		let query = {};
		query.location = req.query.location;
		query.date = new Date(req.query.date);

		const events = await Event.find(query);
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
		const events = await Event.find();
		if (events.length == 0 && req.query.includeFestivals != 'true')
			return res.status(200).json({ data: filters, token: res.locals.token });

		const dereferenced = await dereference.objectArray(events, 'event', 'date', 1);

		if (dereferenced.length > 0) {
			filters.firstDate = dereferenced[0].date;
			filters.lastDate = dereferenced[dereferenced.length - 1].date;
		}

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
			if (events.length == 0 && festivals.length == 0)
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

// post event to database
router.post('/', token.checkToken(true), multerConfig.upload.single('image'), validateEvent.validateObject('post', 'event'), async (req, res) => {
	try {
		let newEvent = res.locals.validated;
		let category;
		if (new Date(newEvent.date) < new Date().setUTCHours(0, 0, 0, 0)) {
			newEvent = await new ArchivedEvent(newEvent).save();
			category = 'events archive'
		}
		else {
			newEvent = await new Event(newEvent).save();
			category = 'events'
		}
		const dereferenced = await dereference.eventObject(newEvent);
		return res.status(200).json({ message: 'Event saved to ' + category, data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple events to database
router.post('/multiple', token.checkToken(true), multerConfig.upload.single('image'), validateEvent.validateList('post', 'event'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			let result;
			if (new Date(object.date) < new Date().setUTCHours(0, 0, 0, 0)) {
				result = await new ArchivedEvent(object).save();
			}
			else {
				result = await new Event(object).save();
			}
			return result;
		});
		const responseList = await Promise.all(promises);
		const dereferenced = await dereference.objectArray(responseList, 'event', 'name', 1);
		return res.status(200).json({ message: responseList.length + ' event(s) saved', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// post multiple events to database from json file
router.post('/fromJSON', token.checkToken(true), multerConfig.uploadJSON.single('file'), validateEvent.validateFromJson('post', 'event'), async (req, res) => {
	try {
		const objectList = res.locals.validated;
		const promises = objectList.map(async (object) => {
			const result = await new Event(object).save();
			return result;
		});
		const responseList = await Promise.all(promises);
		const dereferenced = await dereference.objectArray(responseList, 'event', 'name', 1);
		return res.status(200).json({ message: responseList.length + ' event(s) saved', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// convert incoming csv data to matching json
router.post('/convertCSV', token.checkToken(false), multerConfig.uploadCSV.single('file'), async (req, res) => {
	try {
		const events = await csv.convertFile(req.file, 'events');
		return res.status(200).json({ data: events, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// update event by id
router.put('/:_id', token.checkToken(true), multerConfig.upload.single('image'), validateEvent.validateObject('put', 'event'), async (req, res) => {
	try {
		let updatedEvent = res.locals.validated;
		let category = '';
		if (new Date(updatedEvent.date) < new Date().setUTCHours(0, 0, 0, 0)) {
			await Event.remove({ _id: req.params._id });
			updatedEvent = await new ArchivedEvent(updatedEvent).save();
			category = ' and moved to events archive';
		}
		else {
			await Event.updateOne({ _id: req.params._id }, updatedEvent);
			updatedEvent = await Event.findById(req.params._id);
		}

		const dereferenced = await dereference.eventObject(updatedEvent);
		return res.status(200).json({ message: 'Event updated' + category, data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// cancel event by id
router.put('/cancel/:_id', rateLimit.dataLimiter, token.checkToken(false), async (req, res) => {
	try {
		const event = await Event.findById(req.params._id);
		if (!event)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		event.canceled = 1;
		event.lastModified = Date.now();

		const updated = await Event.findOneAndUpdate({ _id: req.params._id }, event, { new: true });
		const dereferenced = await dereference.eventObject(updated);
		return res.status(200).json({ message: 'Event canceled', data: dereferenced, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.deleteObject(req.params._id, 'event');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

module.exports = router;