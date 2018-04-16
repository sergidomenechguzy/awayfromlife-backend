const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('unvalidated_events');

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
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: token.signJWT(req.user.id) });
			});
		})
		.catch(err => {
			throw err;
		});
});

// get paginated events
router.get('/page', passport.authenticate('jwt', { session: false }), (req, res) => {
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
				return res.status(200).json({ message: 'No events found', token: token.signJWT(req.user.id) });
			}
			Event.count()
				.then(count => {
					dereference.eventObjectArray(events, responseEvents => {
						return res.status(200).json({ data: responseEvents, current: page, pages: Math.ceil(count / perPage), token: token.signJWT(req.user.id) });
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
router.get('/byid/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.findOne({ _id: req.params._id })
		.then(event => {
			if (!event) {
				return res.status(200).json({ message: 'No event found with this ID', token: res.locals.token });
			}
			dereference.eventObjectArray(events, responseEvents => {
				return res.status(200).json({ data: responseEvents, token: token.signJWT(req.user.id) });
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
	Event.remove({ _id: req.params._id }, (err, event) => {
		if (err) throw err;
		return res.status(200).json({ message: 'Event deleted', token: token.signJWT(req.user.id) });
	});
});

module.exports = router;