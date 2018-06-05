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

// search route
// get all search results with different possible parameters
router.get('/:query', token.checkToken(false), (req, res) => {
	let categories = ['events', 'locations', 'bands'];
	if (req.query.categories) {
		let queryCategories = req.query.categories.split(',');
		let finalCategories = [];
		queryCategories.forEach(category => {
			if ((category === 'events' || category === 'locations' || category === 'bands') && !finalCategories.includes(category)) {
				finalCategories.push(category);
			}
		});
		if (finalCategories.length > 0) categories = finalCategories;
	}

	const eventSearchAttributes = [
		['title', 'title'],
		['startDate', 'date'],
		['location.name', 'location name'],
		['location.address.street', 'location address'],
		['location.address.city', 'location city'],
		['location.address.county', 'location county'],
		['bands', 'bands']
	];

	const locationSearchAttributes = [
		['name', 'name'],
		['address.street', 'address'],
		['address.city', 'city'],
		['address.county', 'county'],
		['address.country', 'country']
	];

	const bandSearchAttributes = [
		['name', 'name'],
		['genre', 'genre'],
		['origin.name', 'origin city'],
		['origin.country', 'origin country'],
		['recordLabel', 'label'],
		['releases', 'releases']
	];

	let results = {
		events: [],
		locations: [],
		bands: []
	};
	let counter = 0;

	categories.forEach((category, index, array) => {
		if (category === 'events') eventFind(req, res, eventSearchAttributes, (err, eventResults) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			}
			results.events = eventResults;
			counter++;
			if (array.length === counter) return res.status(200).json({ data: results, token: res.locals.token });
		});
		else if (category === 'locations') locationFind(req, res, locationSearchAttributes, (err, locationResults) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			}
			results.locations = locationResults;
			counter++;
			if (array.length === counter) return res.status(200).json({ data: results, token: res.locals.token });
		});
		else if (category === 'bands') bandFind(req, res, bandSearchAttributes, (err, bandResults) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			}
			results.bands = bandResults;
			counter++;
			if (array.length === counter) return res.status(200).json({ data: results, token: res.locals.token });
		});
	});
});

// get a maximum of 6 search results without parameters
router.get('/simple/:query', token.checkToken(false), (req, res) => {
	const eventSearchAttributes = [
		['title', 'title'],
		['startDate', 'date'],
		['location.name', 'location name'],
		['location.address.street', 'location address'],
		['location.address.city', 'location city'],
		['location.address.county', 'location county'],
		['bands', 'bands']
	];

	const locationSearchAttributes = [
		['name', 'name'],
		['address.street', 'address'],
		['address.city', 'city'],
		['address.county', 'county'],
		['address.country', 'country']
	];

	const bandSearchAttributes = [
		['name', 'name'],
		['genre', 'genre'],
		['origin.name', 'origin city'],
		['origin.country', 'origin country'],
		['recordLabel', 'label'],
		['releases', 'releases']
	];

	let results = [];

	eventFind(req, res, eventSearchAttributes, (err, eventResults) => {
		if (err) {
			console.log(err.name + ': ' + err.message);
			return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
		}
		locationFind(req, res, locationSearchAttributes, (err, locationResults) => {
			if (err) {
				console.log(err.name + ': ' + err.message);
				return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
			}
			bandFind(req, res, bandSearchAttributes, (err, bandResults) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}
				
				let counter = 0;

				while (results.length < 6) {
					const prev = results.length;
					if (eventResults.length > counter && results.length < 6) {
						results.push(eventResults[counter]);
					}
					if (locationResults.length > counter && results.length < 6) {
						results.push(locationResults[counter]);
					}
					if (bandResults.length > counter && results.length < 6) {
						results.push(bandResults[counter]);
					}
					if (prev === results.length) break;
					counter++;
				}

				return res.status(200).json({ data: results, token: res.locals.token });
			});
		});
	});
});

const eventFind = (req, res, eventSearchAttributes, next) => {
	const regex = RegExp(req.params.query, 'i');
	eventResults = [];

	let eventQuery = {
		attributes: [],
		values: [],
		genre: []
	};
	if (req.query.city) {
		eventQuery.attributes.push('location.address.city');
		eventQuery.values.push(new RegExp(req.query.city, 'i'));
		eventQuery.attributes.push('location.address.county');
		eventQuery.values.push(new RegExp(req.query.city, 'i'));
	}
	else if (req.query.country) {
		eventQuery.attributes.push('location.address.country');
		eventQuery.values.push(new RegExp(req.query.country, 'i'));
	}
	if (req.query.genre) {
		const genres = req.query.genre.split(',');
		genres.forEach(genre => {
			eventQuery.genre.push(new RegExp(genre, 'i'));
		});
	}

	Event.find()
		.then(events => {
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
				if (err) {
					return next(err, null);
				}

				responseEvents.forEach(event => {
					if (
						(
							eventQuery.attributes.length === 0
							||
							eventQuery.attributes.some((attribute, index) => {
								let value = attribute.split('.').reduce((prev, curr) => {
									return prev[curr];
								}, event);
								if (eventQuery.values[index].test(value)) return true;
								return false;
							})
						)
						&&
						(
							eventQuery.genre.length === 0
							||
							event.bands.some(band => {
								if (eventQuery.genre.some(currentGenre => {
									if (currentGenre.test(band.genre)) return true;
									return false;
								})) return true;
								return false;
							})
						)
					) {

						eventSearchAttributes.some((attribute, index) => {
							let value = attribute[0].split('.').reduce((prev, curr) => {
								return prev[curr];
							}, event);

							if (attribute[0] === 'bands') {
								let bandString = '';
								const match = value.some(currentBand => {
									if (regex.test(currentBand.name)) {
										value.forEach((band, index, array) => {
											bandString += band.name;
											if (index < array.length - 1) bandString += ', ';
										});
										value = bandString;
										eventResults.push({
											category: 'Event',
											data: event,
											match: {
												attribute: 'event.' + attribute[0],
												pretty: attribute[1],
												value: value
											}
										});
										return true;
									}
								});
								return match;
							}
							else if (regex.test(value)) {
								eventResults.push({
									category: 'Event',
									data: event,
									match: {
										attribute: 'event.' + attribute[0],
										pretty: attribute[1],
										value: value
									}
								});
								return true;
							}
							return false;
						});
					}
				});
				return next(null, eventResults);
			});
		})
		.catch(err => {
			return next(err, null);
		});
}

const locationFind = (req, res, locationSearchAttributes, next) => {
	const regex = RegExp(req.params.query, 'i');
	locationResults = [];

	let locationQuery = {};
	if (req.query.genre) return next(null, locationResults);

	if (req.query.city) {
		locationQuery = { $or: [{ 'address.city': new RegExp(req.query.city, 'i') }, { 'address.county': new RegExp(req.query.city, 'i') }] };
	}
	else if (req.query.country) {
		locationQuery = { 'address.country': RegExp(req.query.country, 'i') };
	}

	Location.find(locationQuery)
		.then(locations => {
			locations.forEach(location => {
				locationSearchAttributes.some((attribute, index) => {
					let value = attribute[0].split('.').reduce((prev, curr) => {
						return prev[curr];
					}, location);

					if (regex.test(value)) {
						locationResults.push({
							category: 'Location',
							data: location,
							match: {
								attribute: 'location.' + attribute[0],
								pretty: attribute[1],
								value: value
							}
						});
						return true;
					}
					return false;
				});
			});
			return next(null, locationResults);
		})
		.catch(err => {
			return next(err, null);
		});
}

const bandFind = (req, res, bandSearchAttributes, next) => {
	const regex = RegExp(req.params.query, 'i');
	bandResults = [];

	let bandQuery = {};
	if (req.query.city) {
		const cityString = 'origin.name';
		bandQuery[cityString] = RegExp(req.query.city, 'i');
	}
	else if (req.query.country) {
		const countryString = 'origin.country';
		bandQuery[countryString] = RegExp(req.query.country, 'i');
	}
	if (req.query.genre) {
		const genres = req.query.genre.split(',');
		bandQuery.$or = [];
		genres.forEach(genre => {
			bandQuery.$or.push({ 'genre': RegExp('^' + genre + '$', 'i') });
		});
	}

	Band.find(bandQuery)
		.then(bands => {
			bands.forEach(band => {
				bandSearchAttributes.some((attribute, index) => {
					let value = attribute[0].split('.').reduce((prev, curr) => {
						return prev[curr];
					}, band);

					if (attribute[0] === 'releases') {
						let releaseString = '';
						const match = value.some(currentRelease => {
							if (regex.test(currentRelease.releaseName)) {
								value.forEach((release, index, array) => {
									releaseString += release.releaseName;
									if (index < array.length - 1) releaseString += ', ';
								});
								value = releaseString;
								bandResults.push({
									category: 'Band',
									data: band,
									match: {
										attribute: 'band.' + attribute[0],
										pretty: attribute[1],
										value: value
									}
								});
								return true;
							}
						});
						return match;
					}
					else if (regex.test(value)) {
						bandResults.push({
							category: 'Band',
							data: band,
							match: {
								attribute: 'band.' + attribute[0],
								pretty: attribute[1],
								value: value
							}
						});
						return true;
					}
					return false;
				});
			});

			return next(null, bandResults);
		})
		.catch(err => {
			return next(err, null);
		});
}

module.exports = router;