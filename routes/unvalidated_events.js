const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('unvalidated_events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load params
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');

// unvalidated_events routes
// get all events
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: token.signJWT(req.user.id) });
			}
			dereference.eventObjectArray(events, 'title', 1, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get paginated events
router.get('/page', passport.authenticate('jwt', { session: false }), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage)  === 5 || parseInt(req.query.perPage)  === 10 || parseInt(req.query.perPage)  === 50) perPage = parseInt(req.query.perPage);
	
	let sortBy = ['title'];
	if (req.query.sortBy  === 'startDate' || req.query.sortBy  === 'location') sortBy = req.query.sortBy;
	
	let order = 1
	if (parseInt(req.query.order) === -1) order = -1;
	
	Event.find()
		.then(events => {
			if (events.length === 0) {
				return res.status(200).json({ message: 'No events found', token: token.signJWT(req.user.id) });
			}

			const count = events.length;
			if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

			events.sort((a, b) => {
				if (sortBy === 'location') {
					Location.findOne({ _id: a.location })
						.then(locationA => {
							if (!locationA) {
								return 1;
							}
							Location.findOne({ _id: b.location })
								.then(locationB => {
									if (!locationB) {
										return -1;
									}
									if (order === -1) return locationB.name.localeCompare(locationA.name);
									return locationA.name.localeCompare(locationB.name);
								})
								.catch(err => {
									throw err;
								});
						})
						.catch(err => {
							throw err;
						});
				}
				if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
				return a[sortBy].localeCompare(b[sortBy]);
			});
			events = events.slice((perPage * page) - perPage, (perPage * page));

			dereference.eventObjectArray(events, sortBy, order, responseEvents => {
				return res.status(200).json({ data: responseEvents, current: page, pages: Math.ceil(count / perPage), token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get event by id
router.get('/byid/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(400).json({ message: 'No event found with this ID', token: res.locals.token });
			}
			dereference.eventObject(event, responseEvent => {
				return res.status(200).json({ data: responseEvent, token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

// post event to database
router.post('/', token.checkToken(), params.checkParameters(['title', 'location', 'startDate']), (req, res) => {
	const newEvent = {
		title: req.body.title,
		description: req.body.description,
		location: req.body.location,
		startDate: req.body.startDate,
		endDate: req.body.endDate,
		time: req.body.time,
		bands: req.body.bands
	}
	new Event(newEvent)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Event saved', token: res.locals.token })
		})
		.catch(err => {
			throw err;
		});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(400).json({ message: 'No event found with this ID', token: token.signJWT(req.user.id) });
			}
			Event.remove({ _id: req.params._id }, (err, event) => {
				if (err) throw err;
				return res.status(200).json({ message: 'Event deleted', token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

module.exports = router;