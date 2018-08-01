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
			if (!location) location = 'Location not found';

			if (event.bands.length === 0) {
				const responseEvent = {
					_id: event._id,
					title: event.title,
					description: event.description,
					location: location,
					startDate: event.startDate,
					bands: [],
					canceled: event.canceled,
					ticketLink: event.ticketLink
				};
				return next(null, responseEvent);
			}

			let bandsArray = [];
			event.bands.forEach((bandID, index, array) => {
				Band.findOne({ _id: bandID })
					.then(band => {
						if (!band) band = 'Band not found';
						
						bandsArray.push({ band: band, index: index });

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
								bands: bandsArraySorted,
								canceled: event.canceled,
								ticketLink: event.ticketLink
							};
							return next(null, responseEvent);
						}
					})
					.catch(err => {
						return next(err, null);
					});
			});
		})
		.catch(err => {
			return next(err, null);
		});
}

module.exports.eventObjectArray = (events, sortBy, order, next) => {
	if (events.length === 0) return next(null, []);
	const responseEvents = [];
	events.forEach((event, index, array) => {
		eventObject(event, (err, responseEvent) => {
			if (err) return next(err, null);

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
				return next(null, responseEvents);
			}
		});
	});
}