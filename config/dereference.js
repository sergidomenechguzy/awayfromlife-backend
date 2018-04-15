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

			let bandsArray = [];
			event.bands.forEach((bandID, index, array) => {
				Band.findOne({ _id: bandID })
					.then(band => {
						if (!band) {
							band = 'Band not found';
						}
						bandsArray.push(band);

						if (bandsArray.length === array.length) {
							const responseEvent = {
								_id: event._id,
								title: event.title,
								description: event.description,
								location: location,
								startDate: event.startDate,
								endDate: event.endDate,
								time: event.time,
								bands: bandsArray,
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

module.exports.eventObjectArray = (events, next) => {
	const responseEvents = [];
	events.forEach((event, index, array) => {
		eventObject(event, responseEvent => {
			responseEvents.push(responseEvent);
			console.log(index);

			if (responseEvents.length === array.length) {
				responseEvents.sort((a, b) => {
					return a.title.localeCompare(b.title);
				});
				next(responseEvents);
			}
		});
	});
}