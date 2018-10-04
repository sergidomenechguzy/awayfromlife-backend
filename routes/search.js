const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load token.js
const token = require('../config/token');
// load dereference.js
const dereference = require('../helpers/dereference');

// search route
// get all search results with different possible parameters
router.get('/:query', token.checkToken(false), async (req, res) => {
	try {
		let categories = ['events', 'festivals', 'locations', 'bands'];
		if (req.query.categories != undefined) {
			let queryCategories = req.query.categories.split(',');
			let finalCategories = [];
			queryCategories.forEach(category => {
				if ((category === 'events' || category === 'festivals' || category === 'locations' || category === 'bands') && !finalCategories.includes(category))
					finalCategories.push(category);
			});
			if (finalCategories.length > 0) categories = finalCategories;
		}
		if (req.query.genre != undefined && categories.includes('locations')) {
			categories.splice(categories.indexOf('locations'), 1);
		}

		const categoryFunction = {
			events: eventFind,
			festivals: festivalFind,
			bands: bandFind,
			locations: locationFind
		};

		let results = {
			events: [],
			festivals: [],
			locations: [],
			bands: []
		};

		const queries = createQueries(req.query);
		const promises = categories.map(async (category) => {
			let result = await categoryFunction[category](queries[category], new RegExp(req.params.query, 'i'));
			results[category] = result;
			return result;
		});
		await Promise.all(promises);
		return res.status(200).json({ data: results, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

// get a maximum of 8 search results without parameters
router.get('/simple/:query', token.checkToken(false), async (req, res) => {
	try {
		const categories = ['events', 'festivals', 'locations', 'bands'];
		const categoryFunction = {
			events: eventFind,
			festivals: festivalFind,
			bands: bandFind,
			locations: locationFind
		};
		const maxObjects = 8;

		const queries = createQueries({});
		const promises = categories.map(async (category) => {
			let result = await categoryFunction[category](queries[category], RegExp(req.params.query, 'i'));
			return result;
		});
		const resultLists = await Promise.all(promises);

		let results = [];
		let counter = 0;

		while (results.length < maxObjects) {
			const previousLength = results.length;
			resultLists.forEach(list => {
				if (list.length > counter && results.length < maxObjects)
					results.push(list[counter]);
			});
			if (previousLength === results.length) break;
			counter++;
		}
		results.sort((a, b) => a.category.localeCompare(b.category));
		return res.status(200).json({ data: results, token: res.locals.token });
	}
	catch (err) {
		console.log(err);
		return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
	}
});

const eventFind = (queries, regex) => {
	return new Promise(async (resolve, reject) => {
		try {
			const eventSearchAttributes = [
				['name', 'name'],
				['date', 'date'],
				['location.name', 'location name'],
				['location.address.street', 'location address'],
				['location.address.city', 'location city'],
				['location.address.county', 'location county'],
				['bands', 'bands']
			];
			eventResults = [];

			const events = await Event.find();
			const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);

			dereferenced.forEach(event => {
				if (
					(
						queries.attributes.length == 0
						||
						queries.attributes.some((attribute, index) => {
							let value = attribute.split('.').reduce((prev, curr) => {
								return prev[curr];
							}, event);
							return queries.values[index].test(value);
						})
					)
					&&
					(
						queries.genres.length == 0
						||
						event.bands.some(band => {
							return queries.genres.some(currentGenre => {
								return band.genre.some(genre => {
									return currentGenre.test(genre);
								});
							});
						})
					)
				) {
					eventSearchAttributes.some(attribute => {
						let value = attribute[0].split('.').reduce((prev, curr) => {
							return prev[curr];
						}, event);

						if (attribute[0] === 'bands') {
							let bandString = '';
							return value.some(currentBand => {
								if (regex.test(currentBand.name)) {
									value.forEach((band, index, array) => {
										bandString += band.name;
										if (index < array.length - 1) bandString += ', ';
									});
									value = bandString;
									eventResults.push(buildObject(event, 'Event', attribute, value));
									return true;
								}
							});
						}
						else if (regex.test(value)) {
							eventResults.push(buildObject(event, 'Event', attribute, value));
							return true;
						}
						return false;
					});
				}
			});
			resolve(eventResults);
		}
		catch (err) {
			reject(err);
		}
	});
}

const festivalFind = (queries, regex) => {
	return new Promise(async (resolve, reject) => {
		try {
			const festivalSearchAttributes = [
				['name', 'name'],
				['events.date', 'date'],
				['address.street', 'address'],
				['address.city', 'city'],
				['address.county', 'county'],
				['address.country', 'country'],
				['events.bands', 'bands']
			];
			festivalResults = [];

			const festivals = await Festival.find(queries.query);
			const dereferenced = await dereference.objectArray(festivals, 'festival', 'name', 1);

			dereferenced.forEach(festival => {
				if (
					queries.genres.length == 0
					||
					queries.genres.some(currentGenre => {
						return festival.genre.some(genre => {
							return currentGenre.test(genre);
						});
					})
				) {
					festivalSearchAttributes.some(attribute => {


						if (attribute[0] === 'events.bands') {
							let value = '';
							return festival.events.some(currentFestivalEvent => {
								return currentFestivalEvent.bands.some(currentBand => {
									if (regex.test(currentBand.name)) {
										currentFestivalEvent.bands.forEach((band, index, array) => {
											value += band.name;
											if (index < array.length - 1) value += ', ';
										});
										let finalAttribute = [attribute[0], `\'${currentFestivalEvent.name}\', ${attribute[1]}`];
										festivalResults.push(buildObject(festival, 'Festival', finalAttribute, value));
										return true;
									}
								})
							});
						}
						else if (attribute[0] === 'events.date') {
							let value = '';
							return festival.events.some(currentFestivalEvent => {
								const date = regex.toString().slice(1, regex.toString().length - 2);
								if (currentFestivalEvent.startDate.localeCompare(date) == -1 && currentFestivalEvent.endDate.localeCompare(date) == 1) {
									value = `${currentFestivalEvent.startDate} - ${currentFestivalEvent.endDate}`;
									let finalAttribute = [attribute[0], `\'${currentFestivalEvent.name}\', time period`];
									festivalResults.push(buildObject(festival, 'Festival', finalAttribute, value));
									return true;
								}
							});
						}
						else {
							let value = attribute[0].split('.').reduce((prev, curr) => {
								return prev[curr];
							}, festival);
							if (regex.test(value)) {
								festivalResults.push(buildObject(festival, 'Festival', attribute, value));
								return true;
							}
							return false;
						}

					});
				}
			});
			resolve(festivalResults);
		}
		catch (err) {
			reject(err);
		}
	});
}

const locationFind = (queries, regex) => {
	return new Promise(async (resolve, reject) => {
		try {
			const locationSearchAttributes = [
				['name', 'name'],
				['address.street', 'address'],
				['address.city', 'city'],
				['address.county', 'county'],
				['address.country', 'country']
			];
			locationResults = [];

			const locations = await Location.find(queries);

			locations.forEach(location => {
				locationSearchAttributes.some(attribute => {
					let value = attribute[0].split('.').reduce((prev, curr) => {
						return prev[curr];
					}, location);

					if (regex.test(value)) {
						locationResults.push(buildObject(location, 'Location', attribute, value));
						return true;
					}
					return false;
				});
			});

			resolve(locationResults);
		}
		catch (err) {
			reject(err);
		}
	});
}

const bandFind = (queries, regex) => {
	return new Promise(async (resolve, reject) => {
		try {
			const bandSearchAttributes = [
				['name', 'name'],
				['genre', 'genre'],
				['origin.name', 'origin city'],
				['origin.country', 'origin country'],
				['recordLabel', 'label'],
				['releases', 'releases']
			];
			bandResults = [];

			const bands = await Band.find(queries.query);
			const dereferenced = await dereference.objectArray(bands, 'band', 'name', 1);

			dereferenced.forEach(band => {
				if (
					queries.genres.length == 0
					||
					queries.genres.some(currentGenre => {
						return band.genre.some(genre => {
							return currentGenre.test(genre);
						});
					})
				) {
					bandSearchAttributes.some(attribute => {
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
									bandResults.push(buildObject(band, 'Band', attribute, value));
									return true;
								}
							});
							return match;
						}
						else if (attribute[0] === 'genre') {
							const match = value.some(currentGenre => {
								if (regex.test(currentGenre)) {
									value = value.join(', ');
									bandResults.push(buildObject(band, 'Band', attribute, value));
									return true;
								}
							});
							return match;
						}
						else if (regex.test(value)) {
							bandResults.push(buildObject(band, 'Band', attribute, value));
							return true;
						}
						return false;
					});
				}
			});

			resolve(bandResults);
		}
		catch (err) {
			reject(err);
		}
	});
}

const createQueries = (queries) => {
	let eventQuery = {
		attributes: [],
		values: [],
		genres: []
	};
	let festivalQuery = {
		query: {},
		genres: []
	};
	let locationQuery = {};
	let bandQuery = {
		query: {},
		genres: []
	};

	if (queries.city != undefined) {
		eventQuery.attributes.push('location.address.city');
		eventQuery.values.push(new RegExp(queries.city, 'i'));
		eventQuery.attributes.push('location.address.county');
		eventQuery.values.push(new RegExp(queries.city, 'i'));

		festivalQuery.query = {
			$or: [
				{ 'address.city': new RegExp(queries.city, 'i') },
				{ 'address.county': new RegExp(queries.city, 'i') }
			]
		};

		locationQuery = {
			$or: [
				{ 'address.city': new RegExp(queries.city, 'i') },
				{ 'address.county': new RegExp(queries.city, 'i') }
			]
		};

		bandQuery.query = { 'origin.name': RegExp(queries.city, 'i') };
	}
	else if (queries.country != undefined) {
		eventQuery.attributes.push('location.address.country');
		eventQuery.values.push(new RegExp(queries.country, 'i'));

		festivalQuery.query = { 'address.country': RegExp(queries.country, 'i') };

		locationQuery = { 'address.country': RegExp(queries.country, 'i') };

		bandQuery.query = { 'origin.country': RegExp(queries.country, 'i') };
	}

	if (queries.genre != undefined) {
		const genres = queries.genre.split(',');
		genres.forEach(genre => {
			const genreRegex = new RegExp('^' + genre + '$', 'i');
			eventQuery.genres.push(genreRegex);
			festivalQuery.genres.push(genreRegex);
			bandQuery.genres.push(genreRegex);
		});
	}

	return { events: eventQuery, festivals: festivalQuery, locations: locationQuery, bands: bandQuery };
}

const buildObject = (object, category, attribute, value) => {
	return {
		category: category,
		data: object,
		match: {
			attribute: `${category.toLowerCase()}.${attribute[0]}`,
			pretty: attribute[1],
			value: value
		}
	};
}

module.exports = router;