const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('archived_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load archive.js
const archive = require('../config/archive');

moment.locale('de');

// events routes
// get all events
router.get('/', token.checkToken(false), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: res.locals.token });
			}

			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
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

// get paginated events
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = 'title';
	if (req.query.sortBy === 'startDate' || req.query.sortBy === 'location') sortBy = req.query.sortBy;

	let order = 1;
	if (parseInt(req.query.order) === -1) order = -1;

	let query = {};
	if (req.query.startWith && /^[a-zA-Z]$/.test(req.query.startWith)) {
		if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = new RegExp('^[' + req.query.startWith + 'ä]', 'gi');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = new RegExp('^[' + req.query.startWith + 'ö]', 'gi');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = new RegExp('^[' + req.query.startWith + 'ü]', 'gi');
		else query.name = new RegExp('^' + req.query.startWith, 'gi');
	}

	Event.find(query)
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: res.locals.token });
			}

			dereference.eventObjectArray(events, sortBy, order, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				if (req.query.city || req.query.country || req.query.genre || req.query.date) {
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
									return genreRegex.test(band.genre);
								})
							);
						}
						if (req.query.date) {
							const dateList = req.query.date.split('--');
							if (dateList.length === 1) {
								if (Math.floor(moment(dateList[0]).valueOf() / 86400000) === Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)) result.push(true);
								else result.push(false);
							}
							else if (dateList.length === 2) {
								if (
									Math.floor(moment(dateList[0]).valueOf() / 86400000) <= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)
									&&
									Math.floor(moment(dateList[1]).valueOf() / 86400000) >= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)
								) result.push(true);
								else result.push(false);
							}
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
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			}
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

// get events by title
router.get('/title/:title', token.checkToken(false), (req, res) => {
	let regex = '.*' + req.params.title + '.*';
	Event.find({ title: new RegExp(regex, 'gi') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No event found with this title', token: res.locals.token });
			}
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
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
			if (locations.length === 0) {
				return res.status(200).json({ message: 'No locations found in this city', token: res.locals.token });
			}
			locations.forEach((location, index, array) => {
				Event.find({ location: location._id })
					.then(events => {
						if (events.length > 0) {
							cityEvents = cityEvents.concat(events);
						}

						if (index === array.length - 1) {
							if (cityEvents.length === 0) {
								return res.status(200).json({ message: 'No events found in this city', token: res.locals.token });
							}
							dereference.eventObjectArray(cityEvents, 'title', 1, (err, responseEvents) => {
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
	let regex = '^' + req.params.date;
	Event.find({ startDate: new RegExp(regex, 'g') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found on this date', token: res.locals.token });
			}
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
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
	const time = moment(req.query.date);
	let regex = '^' + time.format('YYYY-MM-DD');

	Event.find({ location: req.query.location, startDate: new RegExp(regex, 'g') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found for this location on this date', token: res.locals.token });
			}
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
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

// move old events to archived events collection
router.get('/archive', token.checkToken(false), (req, res) => {
	archive.events((err, response) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(200).json({ message: `${response.length} event(s) moved to archive.`, token: res.locals.token });
	});
});

// post event to database
router.post('/', token.checkToken(true), params.checkParameters(['title', 'location', 'startDate']), (req, res) => {
	const newEvent = {
		title: req.body.title,
		description: req.body.description,
		location: req.body.location,
		startDate: req.body.startDate,
		endDate: req.body.endDate,
		time: req.body.time,
		bands: req.body.bands,
		canceled: req.body.canceled,
		ticketLink: req.body.ticketLink
	};
	new Event(newEvent)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Event saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// update event by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['title', 'location', 'startDate']), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			}
			const update = {
				title: req.body.title,
				description: req.body.description,
				location: req.body.location,
				startDate: req.body.startDate,
				endDate: req.body.endDate,
				time: req.body.time,
				bands: req.body.bands,
				canceled: req.body.canceled,
				ticketLink: req.body.ticketLink,
				lastModified: Date.now()
			};
			Event.findOneAndUpdate({ _id: req.params._id }, update, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Event updated', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete location by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			}
			Event.remove({ _id: req.params._id }, (err, event) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Event deleted', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;