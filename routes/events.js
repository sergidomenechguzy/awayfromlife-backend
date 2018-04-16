const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
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
router.get('/', token.checkToken(), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: res.locals.token });
			}
			// events.sort((a, b) => {
			// 	return a.title.localeCompare(b.title);
			// });
			
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get paginated events
router.get('/page', token.checkToken(), (req, res) => {
	const perPage = (parseInt(req.query.perPage)) || 10;
	const page = (parseInt(req.query.page)) || 1;
	const sortBy = (req.query.sortBy) || 'title';
	const order = (parseInt(req.query.order)) || 1;
	Event.find()
		.collation({ locale: "en", strength: 2 })
		.sort({[sortBy]: order})
		.skip((perPage * page) - perPage)
		.limit(perPage)
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: res.locals.token });
			}
			Event.count()
				.then(count => {
					dereference.eventObjectArray(events, responseEvents => {
						return res.status(200).json({ data: responseEvents, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
					});
				})
				.catch(err => {
					throw err;
				});
		})
		.catch(err => {
			throw err;
		});
});

// get event by id
router.get('/byid/:_id', token.checkToken(), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(200).json({ message: 'No event found with this ID', token: res.locals.token });
			}
			dereference.eventObject(event, responseEvent => {
				return res.status(200).json({ data: responseEvent, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get events by title
router.get('/title/:title', token.checkToken(), (req, res) => {
	let regex = '.*' + req.params.title + '.*';
	Event.find({ title: new RegExp(regex, 'gi') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No event found with this title', token: res.locals.token });
			}
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get events by location id
router.get('/location/:_id', token.checkToken(), (req, res) => {
	Event.find({ location: req.params._id })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found for this location', token: res.locals.token });
			}
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get events by city
router.get('/city/:city', token.checkToken(), (req, res) => {
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
						if(events.length > 0) {
							cityEvents = cityEvents.concat(events);
						}

						if(index === array.length - 1) {
							if (cityEvents.length === 0) {
								return res.status(200).json({ message: 'No events found in this city', token: res.locals.token });
							}
							dereference.eventObjectArray(cityEvents, responseEvents => {
								return res.status(200).json({ data: responseEvents, token: res.locals.token });
							});
						}
					})
					.catch(err => {
						throw err;
					});
			});
		})
		.catch(err => {
			throw err;
		});
});

// get events by date
router.get('/date/:date', token.checkToken(), (req, res) => {
	let regex = '^' + req.params.date;
	Event.find({ startDate: new RegExp(regex, 'g') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found on this date', token: res.locals.token });
			}
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get similar events
router.get('/similar', token.checkToken(), (req, res) => {
	const time = moment(req.query.date);
	let regex = '^' + time.format('YYYY-MM-DD');

	Event.find({ location: req.query.location, startDate: new RegExp(regex, 'g') })
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found for this location on this date', token: res.locals.token });
			}
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: res.locals.token });
			});
		})
		.catch(err => {
			throw err;
		});
});

// post event to database
router.post('/', passport.authenticate('jwt', { session: false }), params.checkParameters(['title', 'location', 'startDate']), (req, res) => {
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
			return res.status(200).json({ message: 'Event saved', token: token.signJWT(req.user.id) })
		})
		.catch(err => {
			throw err;
		});
});

// update event by id
router.put('/:_id', passport.authenticate('jwt', { session: false }), params.checkParameters(['title', 'location', 'startDate']), (req, res) => {
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
		if (err) throw err;
		return res.status(200).json({ message: 'Event updated', token: token.signJWT(req.user.id) });
	});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.remove({ _id: req.params._id }, (err, event) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Event deleted', token: token.signJWT(req.user.id) });
	});
});

module.exports = router;