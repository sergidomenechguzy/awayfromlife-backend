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
// load dereference.js
const dereference = require('../config/dereference');

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
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
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

// get all search results
router.get('/:query', token.checkToken(), (req, res) => {
	const regex = RegExp('.*' + req.params.query + '.*', 'gi');
	let responseList = [];

	Event.find()
		.then(events => {
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				responseEvents.forEach(event => {
					if (regex.test(event.title) 
						|| regex.test(event.location.name) 
						|| regex.test(event.location.address.street) 
						|| regex.test(event.location.address.city) 
						|| regex.test(event.location.address.country)) 
							responseList.push({category: 'Event', data: event});
					else {
						event.bands.some(band => {
							if (regex.test(band.name)) {
								responseList.push({category: 'Event', data: event});
								return true;
							}
						});
					}
				});

				Location.find()
					.then(locations => {
						locations.forEach(location => {
							if (regex.test(location.name) 
								|| regex.test(location.address.street) 
								|| regex.test(location.address.city) 
								|| regex.test(location.address.country)) 
									responseList.push({category: 'Location', data: location});
						});

						Band.find()
							.then(bands => {
								bands.forEach(band => {
									if (regex.test(band.name) 
										|| regex.test(band.genre) 
										|| regex.test(band.origin.name) 
										|| regex.test(band.origin.country)) 
											responseList.push({category: 'Band', data: band});
								});

								// responseList.sort((a, b) => {
								// 	return a.title.localeCompare(b.title);
								// });
	
								return res.status(200).json({ data: responseList, token: res.locals.token });
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
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

module.exports = router;