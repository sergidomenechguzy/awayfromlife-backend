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
// get all search results
router.get('/:query', token.checkToken(false), (req, res) => {
	const regex = RegExp('.*' + req.params.query + '.*', 'i');
	let results = {
		eventList: [],
		locationList: [],
		bandList: []
	};

	const eventSearchAttributes = ['title', 'startDate', 'location.name', 'location.address.street', 'location.address.city', 'bands'];
	const eventAttributeStrings = ['title', 'date', 'location name', 'location address', 'location city', 'bands'];

	const locationSearchAttributes = ['name', 'address.street', 'address.city', 'address.country'];
	const locationAttributeStrings = ['name', 'address', 'city', 'country'];

	const bandSearchAttributes = ['name', 'genre', 'origin.name', 'origin.country', 'recordLabel', 'releases'];
	const bandAttributeStrings = ['name', 'genre', 'origin city', 'origin country', 'label', 'releases'];

	Event.find()
		.then(events => {
			dereference.eventObjectArray(events, 'title', 1, (err, responseEvents) => {
				if (err) {
					console.log(err.name + ': ' + err.message);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.' });
				}

				responseEvents.forEach(event => {
					eventSearchAttributes.some((attribute, index) => {
						let value = attribute.split('.').reduce((prev, curr) => {
							return prev[curr];
						}, event);

						if (attribute === 'bands') {
							let bandString = '';
							const match = value.some(currentBand => {
								if (regex.test(currentBand.name)) {
									value.forEach((band, index, array) => {
										bandString += band.name;
										if (index < array.length - 1) bandString += ', ';
									});
									value = bandString;
									results.eventList.push({
										category: 'Event', 
										data: event, 
										match: {
											attribute: 'event.' + attribute, 
											pretty: eventAttributeStrings[index],
											value: value
										}
									});
									return true;
								}
							});
							return match;
						}
						else if (regex.test(value)) {
							results.eventList.push({
								category: 'Event', 
								data: event, 
								match: {
									attribute: 'event.' + attribute, 
									pretty: eventAttributeStrings[index],
									value: value
								}
							});
							return true;
						}
						return false;
					});
				});

				Location.find()
					.then(locations => {
						locations.forEach(location => {
							locationSearchAttributes.some((attribute, index) => {
								let value = attribute.split('.').reduce((prev, curr) => {
									return prev[curr];
								}, location);
								
								if (regex.test(value)) {
									results.locationList.push({
										category: 'Location', 
										data: location, 
										match: {
											attribute: 'location.' + attribute, 
											pretty: locationAttributeStrings[index],
											value: value
										}
									});
									return true;
								}
								return false;
							});
						});

						Band.find()
							.then(bands => {
								bands.forEach(band => {
									bandSearchAttributes.some((attribute, index) => {
										let value = attribute.split('.').reduce((prev, curr) => {
											return prev[curr];
										}, band);
				
										if (attribute === 'releases') {
											let releaseString = '';
											const match = value.some(currentRelease => {
												if (regex.test(currentRelease.releaseName)) {
													value.forEach((release, index, array) => {
														releaseString += release.releaseName;
														if (index < array.length - 1) releaseString += ', ';
													});
													value = releaseString;
													results.bandList.push({
														category: 'Band', 
														data: band, 
														match: {
															attribute: 'band.' + attribute, 
															pretty: bandAttributeStrings[index],
															value: value
														}
													});
													return true;
												}
											});
											return match;
										}
										else if (regex.test(value)) {
											results.bandList.push({
												category: 'Band', 
												data: band, 
												match: {
													attribute: 'band.' + attribute, 
													pretty: bandAttributeStrings[index],
													value: value
												}
											});
											return true;
										}
										return false;
									});
								});
	
								return res.status(200).json({ data: results, token: res.locals.token });
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