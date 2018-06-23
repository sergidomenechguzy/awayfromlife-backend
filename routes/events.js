const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');

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
	if (req.query.startWith && /^[a-zA-Z#]$/.test(req.query.startWith)) {
		if (req.query.startWith === '#') query.title = new RegExp('^[^a-zäÄöÖüÜ]', 'i');
		else if (req.query.startWith === 'a' || req.query.startWith === 'A') query.title = new RegExp('^[' + req.query.startWith + 'äÄ]', 'i');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.title = new RegExp('^[' + req.query.startWith + 'öÖ]', 'i');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.title = new RegExp('^[' + req.query.startWith + 'üÜ]', 'i');
		else query.title = new RegExp('^' + req.query.startWith, 'i');
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
									return genreRegex.test(band.genre);
								})
							);
						}
						if (req.query.startDate && req.query.endDate) {
							if (
								Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)
								&&
								Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)
							) result.push(true);
							else result.push(false);
						}
						else if (req.query.startDate) {
							if (Math.floor(moment(req.query.startDate).valueOf() / 86400000) <= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)) 
								result.push(true);
							else result.push(false);
						}
						else if (req.query.endDate) {
							if (Math.floor(moment(req.query.endDate).valueOf() / 86400000) >= Math.floor(moment(responseEvent.startDate).valueOf() / 86400000)) 
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
	const regex = new RegExp('^' + moment(req.params.date).format('YYYY-MM-DD'));

	// let regex = '^' + req.params.date;
	Event.find({ startDate: regex })
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
	const regex = new RegExp('^' + moment(req.query.date).format('YYYY-MM-DD'));

	Event.find({ location: req.query.location, startDate: regex })
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
			dereference.eventObjectArray(events, 'startDate', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				filters.firstDate = responseEvents[0].startDate;
				filters.lastDate = responseEvents[responseEvents.length - 1].startDate;
				
				responseEvents.forEach(event => {
					if (event.title && !filters.startWith.includes(event.title.charAt(0).toUpperCase())) {
						if (event.title.charAt(0).toUpperCase() === 'Ä') {
							if (!filters.startWith.includes('A')) filters.startWith.push('A');
						}
						else if (event.title.charAt(0).toUpperCase() === 'Ö') {
							if (!filters.startWith.includes('O')) filters.startWith.push('O');
						}
						else if (event.title.charAt(0).toUpperCase() === 'Ü') {
							if (!filters.startWith.includes('U')) filters.startWith.push('U');
						}
						else if (/[A-Z]/.test(event.title.charAt(0).toUpperCase())) filters.startWith.push(event.title.charAt(0).toUpperCase());
						else if (!filters.startWith.includes('#')) filters.startWith.push('#');
					}
					if (event.location.address.city && !filters.cities.includes(event.location.address.city)) filters.cities.push(event.location.address.city);
					if (event.location.address.country && !filters.countries.includes(event.location.address.country)) filters.countries.push(event.location.address.country);
					event.bands.forEach(band => {
						if (band.genre && !filters.genres.includes(band.genre)) filters.genres.push(band.genre);
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
			return res.status(200).json({ message: 'Event saved', token: res.locals.token })
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