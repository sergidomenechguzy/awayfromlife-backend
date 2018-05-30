const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load params
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');

// bands routes
// get all bands
router.get('/', token.checkToken(false), (req, res) => {
	Band.find()
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });
			}
			bands.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: bands, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get paginated bands
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = ['name'];
	if (req.query.sortBy === 'genre' || req.query.sortBy === 'origin.name') sortBy = req.query.sortBy.split('.');

	let order = 1;
	if (parseInt(req.query.order) === -1) order = -1;

	let query = {};
	if (req.query.startWith && /^[a-zA-Z]$/.test(req.query.startWith)) {
		if (req.query.startWith === 'a' || req.query.startWith === 'A') query.name = new RegExp('^[' + req.query.startWith + 'ä]', 'gi');
		else if (req.query.startWith === 'o' || req.query.startWith === 'O') query.name = new RegExp('^[' + req.query.startWith + 'ö]', 'gi');
		else if (req.query.startWith === 'u' || req.query.startWith === 'U') query.name = new RegExp('^[' + req.query.startWith + 'ü]', 'gi');
		else query.name = new RegExp('^' + req.query.startWith, 'gi');
	}
	if (req.query.city) {
		const cityString = 'origin.name';
		query[cityString] = RegExp(req.query.city, 'i');
	}
	else if (req.query.country) {
		const countryString = 'origin.country';
		query[countryString] = RegExp(req.query.country, 'i');
	}
	if (req.query.genre) query.genre = RegExp(req.query.genre, 'i');
	if (req.query.label) query.recordLabel = RegExp(req.query.label, 'i');

	Band.find(query)
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });
			}

			const count = bands.length;
			if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);

			bands.sort((a, b) => {
				if (sortBy.length === 2) {
					if (order === -1) return b[sortBy[0]][sortBy[1]].localeCompare(a[sortBy[0]][sortBy[1]]);
					return a[sortBy[0]][sortBy[1]].localeCompare(b[sortBy[0]][sortBy[1]]);
				}
				if (order === -1) return b[sortBy[0]].localeCompare(a[sortBy[0]]);
				return a[sortBy[0]].localeCompare(b[sortBy[0]]);
			});
			bands = bands.slice((perPage * page) - perPage, (perPage * page));

			return res.status(200).json({ data: bands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });

		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get band by id
router.get('/byid/:_id', token.checkToken(false), (req, res) => {
	Band.findOne({ _id: req.params._id })
		.then(band => {
			if (!band) {
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			}
			return res.status(200).json({ data: band, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all bands events
router.get('/events/:_id', token.checkToken(false), (req, res) => {
	let eventList = [];

	Event.find()
		.then(events => {
			events.forEach(event => {
				if (event.bands.indexOf(req.params._id) > -1) eventList.push(event);
			});

			if (eventList.length === 0) return res.status(200).json({ message: 'No events found for this band.', token: res.locals.token });

			dereference.eventObjectArray(eventList, 'startDate', 1, (err, responseEvents) => {
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

// get bands by name
router.get('/name/:name', token.checkToken(false), (req, res) => {
	let regex = '.*' + req.params.name + '.*';
	Band.find({ name: new RegExp(regex, 'gi') })
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No band found with this name', token: res.locals.token });
			}
			bands.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: bands, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(false), (req, res) => {
	let regex = '.*' + req.params.genre + '.*';
	Band.find({ genre: new RegExp(regex, 'gi') })
		.then(bands => {
			if (bands.length === 0) {
				return res.status(200).json({ message: 'No bands found with this genre', token: res.locals.token });
			}
			bands.sort((a, b) => {
				return a.name.localeCompare(b.name);
			});
			return res.status(200).json({ data: bands, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all labels
router.get('/labels', token.checkToken(false), (req, res) => {
	let labelList = [];
	Band.find()
		.then(bands => {
			bands.forEach(band => {
				if (band.recordLabel && !labelList.includes(band.recordLabel)) labelList.push(band.recordLabel);
			});
			labelList.sort((a, b) => {
				return a.localeCompare(b);
			});
			return res.status(200).json({ data: labelList, token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post band to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), (req, res) => {
	const newBand = {
		name: req.body.name,
		genre: req.body.genre,
		origin: {
			name: req.body.origin.name,
			administrative: req.body.origin.administrative,
			country: req.body.origin.country,
			postcode: req.body.origin.postcode,
			lat: req.body.origin.lat,
			lng: req.body.origin.lng,
			value: req.body.origin.value
		},
		history: req.body.history,
		recordLabel: req.body.recordLabel,
		releases: req.body.releases,
		foundingDate: req.body.foundingDate,
		websiteUrl: req.body.websiteUrl,
		bandcampUrl: req.body.bandcampUrl,
		soundcloudUrl: req.body.soundcloudUrl,
		facebookUrl: req.body.facebookUrl
	};
	new Band(newBand)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Band saved', token: res.locals.token })
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// update band by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'genre']), (req, res) => {
	Band.findOne({ _id: req.params._id })
		.then(band => {
			if (!band) {
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			}
			const update = {
				name: req.body.name,
				genre: req.body.genre,
				origin: {
					name: req.body.origin.name,
					administrative: req.body.origin.administrative,
					country: req.body.origin.country,
					postcode: req.body.origin.postcode,
					lat: req.body.origin.lat,
					lng: req.body.origin.lng,
					value: req.body.origin.value
				},
				history: req.body.history,
				recordLabel: req.body.recordLabel,
				releases: req.body.releases,
				foundingDate: req.body.foundingDate,
				websiteUrl: req.body.websiteUrl,
				bandcampUrl: req.body.bandcampUrl,
				soundcloudUrl: req.body.soundcloudUrl,
				facebookUrl: req.body.facebookUrl
			};
			Band.findOneAndUpdate({ _id: req.params._id }, update, (err, band) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ message: 'Band updated', token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// delete band by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Band.findOne({ _id: req.params._id })
		.then(band => {
			if (!band) {
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			}
			Band.remove({ _id: req.params._id }, (err, band) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				Event.find()
					.then(events => {
						events.forEach(event => {
							const index = event.bands.indexOf(req.params._id);
							if (index > -1) {
								event.bands.splice(index, 1);
								Event.findOneAndUpdate({ _id: event._id }, event, (err, updatedEvent) => {
									if (err) {
										console.log(err.name + ': ' + err.message);
										return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
									}
								});
							}
						});
						return res.status(200).json({ message: 'Band deleted', token: res.locals.token });
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