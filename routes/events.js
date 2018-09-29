const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load delete route
const deleteRoute = require('./controller/delete');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');
// load validateEvent.js
const validateEvent = require('../helpers/validateEvent');

moment.locale('de');

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
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// get all events including unvalidated events
router.get('/all', token.checkToken(false), (req, res) => {
	Event.find()
		.then(events => {
			UnvalidatedEvent.find()
				.then(unvalidatedEvents => {
					if (events.length === 0 && unvalidatedEvents.length === 0)
						return res.status(200).json({ message: 'No events found', token: res.locals.token });

					dereference.eventObjectArray(events, 'name', 1, (err, responseEvents1) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						dereference.eventObjectArray(unvalidatedEvents, 'name', 1, (err, responseEvents2) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							const allEvents = {
								validated: responseEvents1,
								unvalidated: responseEvents2
							};
							return res.status(200).json({ data: allEvents, token: res.locals.token });
						});
					});
				})
				.catch(err => {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get paginated events
router.get('/page', token.checkToken(false), (req, res) => {
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

	Event.find(query)
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No events found', token: res.locals.token });

			dereference.eventObjectArray(events, sortBy, order, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				if (req.query.city || req.query.country || req.query.genre || req.query.startDate || req.query.endDate) {
					finalEvents = [];
					responseEvents.forEach(responseEvent => {
						let result = [];
						if (req.query.city) {
							const cityRegex = RegExp(req.query.city, 'i');
							if (cityRegex.test(responseEvent.location.address.city) || cityRegex.test(responseEvent.location.address.county))
								result.push(true);
							else result.push(false);
						}
						else if (req.query.country) {
							const countryRegex = RegExp(req.query.country, 'i');
							if (countryRegex.test(responseEvent.location.address.country))
								result.push(true);
							else result.push(false);
						}
						if (req.query.genre) {
							const genreRegex = RegExp(req.query.genre, 'i');
							result.push(
								responseEvent.bands.some(band => {
									return band.genre.some(genre => {
										return genreRegex.test(genre);
									});
								})
							);
						}
						if (req.query.startDate && req.query.endDate) {
							if (
								Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(responseEvent.date).valueOf() / 86400000)
								&&
								Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(responseEvent.date).valueOf() / 86400000)
							) result.push(true);
							else result.push(false);
						}
						else if (req.query.startDate) {
							if (Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(responseEvent.date).valueOf() / 86400000))
								result.push(true);
							else result.push(false);
						}
						else if (req.query.endDate) {
							if (Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(responseEvent.date).valueOf() / 86400000))
								result.push(true);
							else result.push(false);
						}
						if (result.reduce((acc, current) => acc && current, true)) finalEvents.push(responseEvent);
					});
					responseEvents = finalEvents;
				}

				const count = responseEvents.length;
				if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

				responseEvents = responseEvents.slice((perPage * page) - perPage, (perPage * page));
				return res.status(200).json({ data: responseEvents, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get event by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	Event.findById(req.params._id)
		.then(event => {
			if (!event)
				return res.status(200).json({ message: 'No event found with this ID', token: res.locals.token });

			dereference.eventObject(event, (err, responseEvent) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseEvent, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get event by name-url
router.get('/byurl/:url', token.checkToken(false), (req, res) => {
	Event.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') })
		.then(event => {
			if (!event)
				return res.status(200).json({ message: 'No event found with this URL', token: res.locals.token });

			dereference.eventObject(event, (err, responseEvent) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseEvent, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get events by name
router.get('/name/:name', token.checkToken(false), (req, res) => {
	let regex = '.*' + req.params.name + '.*';
	Event.find({ name: new RegExp(regex, 'gi') })
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No event found with this name', token: res.locals.token });

			dereference.eventObjectArray(events, 'name', 1, (err, responseEvents) => {
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

// get events by city
router.get('/city/:city', token.checkToken(false), (req, res) => {
	let cityEvents = [];
	let regex = '.*' + req.params.city + '.*';

	Location.find({ 'address.city': new RegExp(regex, 'gi') })
		.then(locations => {
			if (locations.length === 0)
				return res.status(200).json({ message: 'No locations found in this city', token: res.locals.token });

			locations.forEach((location, index, array) => {
				Event.find({ location: location._id })
					.then(events => {
						if (events.length > 0)
							cityEvents = cityEvents.concat(events);

						if (index === array.length - 1) {
							if (cityEvents.length === 0)
								return res.status(200).json({ message: 'No events found in this city', token: res.locals.token });

							dereference.eventObjectArray(cityEvents, 'name', 1, (err, responseEvents) => {
								if (err) {
									console.log(err.name + ': ' + err.message);
									return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
								}
								return res.status(200).json({ data: responseEvents, token: res.locals.token });
							});
						}
					})
					.catch(err => {
						console.log(err.name + ': ' + err.message);
						return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
					});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get events by date
router.get('/date/:date', token.checkToken(false), (req, res) => {
	Event.find({ date: new RegExp('^' + req.params.date) })
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No events found on this date', token: res.locals.token });

			dereference.eventObjectArray(events, 'date', 1, (err, responseEvents) => {
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

// get canceled events
router.get('/canceled', token.checkToken(true), (req, res) => {
	Event.find({ canceled: 1 })
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No canceled events found.', token: res.locals.token });

			dereference.eventObjectArray(events, 'name', 1, (err, responseEvents) => {
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

// get similar events
router.get('/similar', token.checkToken(false), (req, res) => {
	if (!req.query.location || !req.query.date)
		return res.status(400).json({ message: 'Parameter(s) missing: location and date are required.' });
	let query = {};
	query.location = req.query.location;
	query.date = new RegExp('^' + moment(req.query.date).format('YYYY-MM-DD'));

	Event.find(query)
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ message: 'No events found for this location on this date', token: res.locals.token });

			dereference.eventObjectArray(events, 'name', 1, (err, responseEvents) => {
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

// get all filter data
router.get('/filters', token.checkToken(false), (req, res) => {
	let filters = {
		startWith: [],
		cities: [],
		countries: [],
		genres: [],
		firstDate: '',
		lastDate: ''
	};
	Event.find()
		.then(events => {
			if (events.length === 0)
				return res.status(200).json({ data: filters, token: res.locals.token });

			dereference.eventObjectArray(events, 'date', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				filters.firstDate = responseEvents[0].date;
				filters.lastDate = responseEvents[responseEvents.length - 1].date;

				responseEvents.forEach(event => {
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
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post event to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('post', 'event'), (req, res) => {
	new Event(res.locals.validated)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Event saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post multiple events to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'location', 'date', 'bands']), validateEvent.validateList('post', 'event'), (req, res) => {
	const eventList = res.locals.validated;
	let savedEvents = 0;
	eventList.forEach(event => {
		new Event(event)
			.save()
			.then(() => {
				savedEvents++;
				if (eventList.length == savedEvents)
					return res.status(200).json({ message: savedEvents + ' event(s) saved', token: res.locals.token });
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'location', 'date', 'bands']), validateEvent.validateObject('put', 'event'), async (req, res) => {
	try {
		await Event.findOneAndUpdate({ _id: req.params._id }, res.locals.validated);
		return res.status(200).json({ message: 'Event updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// cancel event by id
router.put('/cancel/:_id', token.checkToken(false), async (req, res) => {
	try {
		const event = await Event.findById(req.params._id);
		if (!event)
			return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });

		event.canceled = 1;
		event.lastModified = Date.now();

		await Event.findOneAndUpdate({ _id: req.params._id }, event);
		return res.status(200).json({ message: 'Event updated', token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

// delete event by id
router.delete('/:_id', token.checkToken(true), async (req, res) => {
	try {
		const response = await deleteRoute.delete(req.params._id, 'validEvent');
		return res.status(response.status).json({ message: response.message, token: res.locals.token });
	}
	catch (err) {
		console.log(err.name + ': ' + err.message);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
	}
});

module.exports = router;