const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load params.js
const params = require('../config/params');
// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../config/dereference');
// load validate.js
const validate = require('../config/validate');
// load validate-multiple.js
const validate_multiple = require('../config/validate-multiple');

// bands routes
// get all bands
router.get('/', token.checkToken(false), (req, res) => {
	Band.find()
		.then(bands => {
			if (bands.length === 0) 
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });
			
			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all bands including unvalidated bands
router.get('/all', token.checkToken(false), (req, res) => {
	Band.find()
		.then(bands => {
			UnvalidatedBand.find()
				.then(unvalidatedBands => {
					if (bands.length === 0 && unvalidatedBands.length === 0) 
						return res.status(200).json({ message: 'No bands found', token: res.locals.token });
					
					dereference.bandObjectArray(bands, 'name', 1, (err, responseBands1) => {
						if (err) {
							console.log(err.name + ': ' + err.message);
							return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
						}
						dereference.bandObjectArray(unvalidatedBands, 'name', 1, (err, responseBands2) => {
							if (err) {
								console.log(err.name + ': ' + err.message);
								return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
							}
							const allBands = {
								validated: responseBands1,
								unvalidated: responseBands2
							};
							return res.status(200).json({ data: allBands, token: res.locals.token });
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

// get paginated bands
router.get('/page', token.checkToken(false), (req, res) => {
	let page = 1;

	let perPage = 20;
	if (parseInt(req.query.perPage) === 5 || parseInt(req.query.perPage) === 10 || parseInt(req.query.perPage) === 50) perPage = parseInt(req.query.perPage);

	let sortBy = 'name';
	if (req.query.sortBy === 'genre' || req.query.sortBy === 'origin.name') sortBy = req.query.sortBy;

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
	if (req.query.city) {
		const cityString = 'origin.name';
		query[cityString] = RegExp(req.query.city, 'i');
	}
	else if (req.query.country) {
		const countryString = 'origin.country';
		query[countryString] = RegExp(req.query.country, 'i');
	}
	if (req.query.label) query.recordLabel = RegExp(req.query.label, 'i');

	Band.find(query)
		.then(bands => {
			if (bands.length === 0) 
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });

			dereference.bandObjectArray(bands, sortBy, order, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				let finalBands = [];
				if (req.query.genre) {
					const genreRegex = RegExp(req.query.genre, 'i');
					responseBands.forEach(responseBand => {
						responseBand.genre.some(genre => {
							if (genreRegex.test(genre)) {
								finalBands.push(responseBand);
								return true;
							}
							return false;
						});
					});
				}
				else finalBands = responseBands;

				const count = finalBands.length;
				if (parseInt(req.query.page) > 0 && parseInt(req.query.page) <= Math.ceil(count / perPage)) page = parseInt(req.query.page);
				finalBands = finalBands.slice((perPage * page) - perPage, (perPage * page));

				return res.status(200).json({ data: finalBands, current: page, pages: Math.ceil(count / perPage), token: res.locals.token });
			});
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
			if (!band) 
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			
			dereference.bandObject(band, (err, responseBand) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBand, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get band by name-url
router.get('/byurl/:url', token.checkToken(false), (req, res) => {
	Band.findOne({ url: new RegExp('^' + req.params.url + '$', 'i') })
		.then(band => {
			if (!band) 
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			
			dereference.bandObject(band, (err, responseBand) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBand, token: res.locals.token });
			});
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

			dereference.eventObjectArray(eventList, 'date', 1, (err, responseEvents) => {
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
			if (bands.length === 0) 
				return res.status(200).json({ message: 'No band found with this name', token: res.locals.token });
			
			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get bands by genre
router.get('/genre/:genre', token.checkToken(false), (req, res) => {
	let regex = new RegExp('^' + req.params.genre + '$', 'i');
	Band.find()
		.then(bands => {
			if (bands.length === 0) 
				return res.status(200).json({ message: 'No bands found', token: res.locals.token });

			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				let genreBands = [];
				responseBands.forEach(band => {
					band.genre.some(genre => {
						if (regex.test(genre)) {
							genreBands.push(band);
							return true;
						}
						return false;
					});
				});
				return res.status(200).json({ data: genreBands, token: res.locals.token });
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// get all genres
router.get('/genres', token.checkToken(false), (req, res) => {
	let genreList = [];
	Band.find()
		.then(bands => {
			Genre.find()
				.then(genres => {
					genres.forEach(genre => {
						bands.some(band => {
							if (band.genre.includes('' + genre._id)) {
								genreList.push(genre.name);
								return true;
							}
							return false;
						});
					});
					genreList.sort((a, b) => {
						return a.localeCompare(b);
					});
					return res.status(200).json({ data: genreList, token: res.locals.token });
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

// get similar bands
router.get('/similar', token.checkToken(false), (req, res) => {
	if(!req.query.name || !req.query.country)
		return res.status(400).json({ message: 'Parameter(s) missing: name and country are required.' });
	let query = {};
	query.name = new RegExp('^' + req.query.name + '$', 'i');
	const countryString = 'origin.country';
	query[countryString] = new RegExp('^' + req.query.country + '$', 'i');

	Band.find(query)
		.then(bands => {
			if (bands.length === 0) 
				return res.status(200).json({ message: 'No bands found with this name from this country.', token: res.locals.token });
			
			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				return res.status(200).json({ data: responseBands, token: res.locals.token });
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
		genres: [],
		labels: [],
		cities: [],
		countries: []
	};
	Band.find()
		.then(bands => {
			if (bands.length === 0) 
				return res.status(200).json({ data: filters, token: res.locals.token });
			
			dereference.bandObjectArray(bands, 'name', 1, (err, responseBands) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				responseBands.forEach(band => {
					if (band.name && !filters.startWith.includes(band.name.charAt(0).toUpperCase())) {
						if (band.name.charAt(0).toUpperCase() === 'Ä') {
							if (!filters.startWith.includes('A')) filters.startWith.push('A');
						}
						else if (band.name.charAt(0).toUpperCase() === 'Ö') {
							if (!filters.startWith.includes('O')) filters.startWith.push('O');
						}
						else if (band.name.charAt(0).toUpperCase() === 'Ü') {
							if (!filters.startWith.includes('U')) filters.startWith.push('U');
						}
						else if (/[A-Z]/.test(band.name.charAt(0).toUpperCase())) 
							filters.startWith.push(band.name.charAt(0).toUpperCase());
						else if (!filters.startWith.includes('#')) 
							filters.startWith.push('#');
					}
					band.genre.forEach(genre => {
						if (genre && !filters.genres.includes(genre)) filters.genres.push(genre);
					});
					if (band.recordLabel && !filters.labels.includes(band.recordLabel)) 
						filters.labels.push(band.recordLabel);
					if (band.origin.name && !filters.cities.includes(band.origin.name)) 
						filters.cities.push(band.origin.name);
					if (band.origin.country && !filters.countries.includes(band.origin.country)) 
						filters.countries.push(band.origin.country);
				});
				filters.startWith.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.genres.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.labels.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.cities.sort((a, b) => {
					return a.localeCompare(b);
				});
				filters.countries.sort((a, b) => {
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

// post band to database
router.post('/', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validate.reqBand('post'), (req, res) => {
	new Band(res.locals.validated)
		.save()
		.then(() => {
			return res.status(200).json({ message: 'Band saved', token: res.locals.token });
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		});
});

// post multiple bands to database
router.post('/multiple', token.checkToken(true), params.checkListParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validate_multiple.reqBandList('post'), (req, res) => {
	const bandList = res.locals.validated;
	let savedBands = 0;
	bandList.forEach(band => {
		new Band(band)
			.save()
			.then(() => {
				savedBands++;
				if (bandList.length == savedBands)
					return res.status(200).json({ message: savedBands + ' band(s) saved', token: res.locals.token });
			})
			.catch(err => {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			});
	});
});

// update band by id
router.put('/:_id', token.checkToken(true), params.checkParameters(['name', 'genre', 'origin.name', 'origin.country', 'origin.lat', 'origin.lng']), validate.reqBand('put'), (req, res) => {
	Band.findOneAndUpdate({ _id: req.params._id }, res.locals.validated, (err, band) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		return res.status(200).json({ message: 'Band updated', token: res.locals.token });
	});
});

// delete band by id
router.delete('/:_id', token.checkToken(true), (req, res) => {
	Band.findOne({ _id: req.params._id })
		.then(band => {
			if (!band) 
				return res.status(400).json({ message: 'No band found with this ID', token: res.locals.token });
			
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