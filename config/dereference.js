const mongoose = require('mongoose');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

const eventObject = module.exports.eventObject = (event, next) => {
	Location.findOne({ _id: event.location })
		.then(location => {
			if (!location) {
				location = 'Location not found';
			}

			if (event.bands.length === 0) {
				const responseEvent = {
					_id: event._id,
					title: event.title,
					description: event.description,
					location: location,
					startDate: event.startDate,
					endDate: event.endDate,
					time: event.time,
					bands: [],
					canceled: event.canceled,
					ticketLink: event.ticketLink
				};
				next(responseEvent);
			}
			
			let bandsArray = [];
			event.bands.forEach((bandID, index, array) => {
				Band.findOne({ _id: bandID })
					.then(band => {
						if (!band) {
							band = 'Band not found';
						}
						bandsArray.push({band: band, index: index});

						if (bandsArray.length === array.length) {
							let bandsArraySorted = [];
							bandsArray.forEach(band => {
								bandsArraySorted[band.index] = band.band;
							});

							const responseEvent = {
								_id: event._id,
								title: event.title,
								description: event.description,
								location: location,
								startDate: event.startDate,
								endDate: event.endDate,
								time: event.time,
								bands: bandsArraySorted,
								canceled: event.canceled,
								ticketLink: event.ticketLink
							};
							next(responseEvent);
						}
					})
					.catch(err => {
						throw err;
					});
			});
		})
		.catch(err => {
			throw err;
		});
}

module.exports.eventObjectArray = (events, sortBy, order, next) => {
	const responseEvents = [];
	events.forEach((event, index, array) => {
		eventObject(event, responseEvent => {
			responseEvents.push(responseEvent);
			
			if (responseEvents.length === array.length) {
				responseEvents.sort((a, b) => {
					if (sortBy === 'location') {
						if (order === -1) return b[sortBy].name.localeCompare(a[sortBy].name);
						return a[sortBy].name.localeCompare(b[sortBy].name);
					}
					if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
					return a[sortBy].localeCompare(b[sortBy]);
				});
				next(responseEvents);
			}
		});
	});
}