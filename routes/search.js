const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load token.js
const token = require('../config/token');

// search routes
// get all elements
router.get('/', token.checkToken(), (req, res) => {
	let responseList = [];

	Event.find()
		.then(events => {
			responseList.push(events);

			Location.find()
				.then(locations => {
					responseList.push(locations);

					Band.find()
						.then(bands => {
							responseList.push(bands);
							return res.status(200).json({ data: responseList, token: res.locals.token });
						})
						.catch(err => {
							throw err;
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

// get all search results
router.get('/:query', token.checkToken(), (req, res) => {
	const regex = '.*' + req.params.query + '.*';
	let responseList = [];

	Event.find({ title: new RegExp(regex, 'gi') })
		.then(events => {
			responseList = events.map(event => {
				return { category: 'Event', title: event.title, id: event._id };
			});

			Location.find({ name: new RegExp(regex, 'gi') })
				.then(locations => {
					responseList = responseList.concat(locations.map(location => {
						return { category: 'Location', title: location.name, id: location._id };
					}));

					Band.find({ name: new RegExp(regex, 'gi') })
						.then(bands => {
							responseList = responseList.concat(bands.map(band => {
								return { category: 'Band', title: band.name, id: band._id };
							}));

							responseList.sort((a, b) => {
								if (a.title.toLowerCase() < b.title.toLowerCase()) {
									return -1;
								}
								if (a.title.toLowerCase() > b.title.toLowerCase()) {
									return 1;
								}
								return 0;
							});

							return res.status(200).json({ data: responseList, token: res.locals.token });
						})
						.catch(err => {
							throw err;
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

module.exports = router;