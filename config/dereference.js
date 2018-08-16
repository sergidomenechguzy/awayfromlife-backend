const mongoose = require('mongoose');

// load location model
require('../models/Event');
const Event = mongoose.model('events');

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
					url: event.url,
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
								url: event.url,
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

const reportObject = module.exports.reportObject = (report, model, next) => {
	model.findOne({ _id: report.item })
		.then(item => {
			if (!item) item = 'Item not found';
			if (report.category === 'event') {
				eventObject(item, (err, responseItem) => {
					if (err) return next(err, null);
					responseReport = {
						_id: report._id,
						category: report.category,
						item: responseItem,
						description: report.description
					}
					return next(null, responseReport);
				});
			}
			else {
				responseReport = {
					_id: report._id,
					category: report.category,
					item: item,
					description: report.description
				}
				return next(null, responseReport);
			}
		})
		.catch(err => {
			return next(err, null);
		});
}

module.exports.reportObjectArray = (reports, order, next) => {
	if (reports.length === 0) return next(null, []);
	let responseReports = [];
	let reportList = {
		event: [],
		location: [],
		band: []
	}
	reports.forEach((report, index, array) => {
		let model = Event;
		if(report.category == 'location') model = Location;
		else if(report.category == 'band') model = Band;

		reportObject(report, model, (err, responseReport) => {
			if (err) return next(err, null);

			reportList[responseReport.category].push(responseReport);

			if ((reportList.event.length + reportList.location.length + reportList.band.length) == array.length) {
				reportList.event.sort((a, b) => {
					if (order === -1) return b.item.title.localeCompare(a.item.title);
					return a.item.title.localeCompare(b.item.title);
				});
				reportList.location.sort((a, b) => {
					if (order === -1) return b.item.name.localeCompare(a.item.name);
					return a.item.name.localeCompare(b.item.name);
				});
				reportList.band.sort((a, b) => {
					if (order === -1) return b.item.name.localeCompare(a.item.name);
					return a.item.name.localeCompare(b.item.name);
				});
				responseReports = responseReports.concat(reportList.band).concat(reportList.event).concat(reportList.location);

				return next(null, responseReports);
			}
		});
	});
}