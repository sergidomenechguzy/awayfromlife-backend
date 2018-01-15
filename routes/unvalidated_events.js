const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('unvalidated_events');

// load params
const params = require('../config/params.js');

// unvalidated_events routes
// get all events
router.get('/', passport.authenticate('jwt', { session: false }), (req, res) => {
	Event.find()
		.then(events => {
			if (events.length == 0) {
				return res.status(200).json({ message: "No events found" });
			}
			return res.json(events);
		})
		.catch((err) => {
			throw err;
		});
});

// get paginated events
router.get('/:page/:perPage', (req, res) => {
	const perPage = (parseInt(req.params.perPage)) || 10;
	const page = (parseInt(req.params.page)) || 0;
	Event.find()
		.skip((perPage * page) - perPage)
		.limit(perPage)
		.then(events => {
			if (events.length == 0) {
				return res.status(200).json({ message: "No events found" });
			}
			Event.count().then((count) => {
				return res.json({
					events: events,
					current: page,
					pages: Math.ceil(count / perPage)
				});
			}).catch((err) => {
				throw err;
			});
		})
		.catch((err) => {
			throw err;
		});
});

// get event by id
router.get('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Event.findOne(id)
		.then(event => {
			if (!event) {
				return res.status(200).json({ message: "No event found with this ID" });
			}
			return res.json(event);
		})
		.catch((err) => {
			throw err;
		});
});

// get events by title
router.get('/title/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
	let regex = ".*" + req.params.title + ".*";
	Event.find({ title: new RegExp(regex, "gi") })
		.then((events) => {
			if (events.length == 0) {
				return res.status(200).json({ message: "No event found with this title" });
			}
			return res.json(events);
		})
		.catch((err) => {
			throw err;
		});
});

// get events by date
router.get('/date/:date', passport.authenticate('jwt', { session: false }), (req, res) => {
	let regex = "^" + req.params.date;
	Event.find({ startDate: new RegExp(regex, "g") })
		.then((events) => {
			if (events.length == 0) {
				return res.status(200).json({ message: "No events found on this date" });
			}
			return res.json(events);
		})
		.catch((err) => {
			throw err;
		});
});

// post event to database
router.post('/', params.checkParameters(["title", "location", "startDate"]), (req, res) => {
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
			return res.status(200).json({ message: "Event saved" })
		})
		.catch((err) => {
			throw err;
		});
});

// delete location by id
router.delete('/:_id', passport.authenticate('jwt', { session: false }), (req, res) => {
	const id = { _id: req.params._id };
	Event.remove(id, (err, event) => {
		if (err) throw err;
		return res.status(200).json({ message: "Event deleted" });
	});
});

module.exports = router;