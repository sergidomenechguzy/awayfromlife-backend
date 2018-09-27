const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load genre model
require('../models/Genre');
const Genre = mongoose.model('genres');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load festival event model
require('../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

const bandObject = module.exports.bandObject = (band, next) => {
	if (typeof band == 'string') return next(null, band);

	let genreList = [];
	band.genre.forEach(genreID => {
		Genre.findOne({ _id: genreID })
			.then(genre => {
				genreList.push(genre.name);

				if (band.genre.length === genreList.length) {
					genreList.sort((a, b) => {
						return a.localeCompare(b);
					});
					const responseBand = {
						_id: band._id,
						name: band.name,
						url: band.url,
						genre: genreList,
						origin: band.origin,
						history: band.history,
						recordLabel: band.recordLabel,
						releases: band.releases,
						foundingDate: band.foundingDate,
						websiteUrl: band.websiteUrl,
						bandcampUrl: band.bandcampUrl,
						soundcloudUrl: band.soundcloudUrl,
						facebookUrl: band.facebookUrl
					};
					return next(null, responseBand);
				}
			})
			.catch(err => {
				return next(err, null);
			});
	});
}

module.exports.bandObjectArray = (bands, sortBy, order, next) => {
	if (bands.length === 0) return next(null, []);

	const responseBands = [];
	bands.forEach((band, index, array) => {
		bandObject(band, (err, responseBand) => {
			if (err) return next(err, null);

			responseBands.push(responseBand);

			if (responseBands.length === array.length) {
				responseBands.sort((a, b) => {
					if (typeof a == 'string') return 1;
					if (typeof b == 'string') return -1;
					if (sortBy === 'origin.name') {
						if (order === -1) return b.origin.name.localeCompare(a.origin.name);
						return a.origin.name.localeCompare(b.origin.name);
					}
					else if (sortBy === 'genre') {
						if (order === -1) return b.genre.reduce((x, y) => x < y ? x : y).localeCompare(a.genre.reduce((x, y) => x < y ? x : y));
						return a.genre.reduce((x, y) => x < y ? x : y).localeCompare(b.genre.reduce((x, y) => x < y ? x : y));
					}
					else {
						if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
						return a[sortBy].localeCompare(b[sortBy]);
					}
				});
				return next(null, responseBands);
			}
		});
	});
}

const eventObject = module.exports.eventObject = (event, next) => {
	if (typeof event == 'string') return next(null, event);

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
					date: event.date,
					time: event.time,
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

						bandObject(band, (err, responseBand) => {
							if (err) return next(err, null);
							bandsArray.push({ band: responseBand, index: index });

							if (bandsArray.length === array.length) {
								let bandsArraySorted = [];
								bandsArray.forEach(bandObject => {
									bandsArraySorted[bandObject.index] = bandObject.band;
								});

								const responseEvent = {
									_id: event._id,
									title: event.title,
									url: event.url,
									description: event.description,
									location: location,
									date: event.date,
									time: event.time,
									bands: bandsArraySorted,
									canceled: event.canceled,
									ticketLink: event.ticketLink
								};
								return next(null, responseEvent);
							}
						});
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
					if (typeof a == 'string') return 1;
					if (typeof b == 'string') return -1;
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

const festivalEventObject = module.exports.festivalEventObject = (event, next) => {
	if (typeof event == 'string') return next(null, event);

	let bandsArray = [];
	event.bands.forEach((bandID, index, array) => {
		Band.findOne({ _id: bandID })
			.then(band => {
				if (!band) band = 'Band not found';

				bandObject(band, (err, responseBand) => {
					if (err) return next(err, null);
					bandsArray.push({ band: responseBand, index: index });

					if (bandsArray.length === array.length) {
						let bandsArraySorted = [];
						bandsArray.forEach(band => {
							bandsArraySorted[band.index] = band.band;
						});

						const responseEvent = {
							_id: event._id,
							title: event.title,
							startDate: event.startDate,
							endDate: event.endDate,
							bands: bandsArraySorted,
							canceled: event.canceled
						};
						return next(null, responseEvent);
					}
				});
			})
			.catch(err => {
				return next(err, null);
			});
	});
}

const festivalEventObjectArray = module.exports.festivalEventObjectArray = (events, sortBy, order, next) => {
	if (events.length === 0) return next(null, []);

	const responseEvents = [];
	events.forEach((event, index, array) => {
		festivalEventObject(event, (err, responseEvent) => {
			if (err) return next(err, null);

			responseEvents.push(responseEvent);

			if (responseEvents.length === array.length) {
				responseEvents.sort((a, b) => {
					if (typeof a == 'string') return 1;
					if (typeof b == 'string') return -1;
					if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
					return a[sortBy].localeCompare(b[sortBy]);
				});
				return next(null, responseEvents);
			}
		});
	});
}

const unvalidatedFestivalObject = module.exports.unvalidatedFestivalObject = (festival, next) => {
	if (typeof festival == 'string') return next(null, festival);

	let genreList = [];
	festival.genre.forEach(genreID => {
		Genre.findOne({ _id: genreID })
			.then(genre => {
				genreList.push(genre.name);
				if (festival.genre.length === genreList.length) {
					genreList.sort((a, b) => {
						return a.localeCompare(b);
					});
					const responseFestival = {
						_id: festival._id,
						title: festival.title,
						url: festival.url,
						description: festival.description,
						genre: genreList,
						events: festival.events,
						address: festival.address,
						ticketLink: festival.ticketLink,
						website: festival.website,
						facebookUrl: festival.facebookUrl
					};
					return next(null, responseFestival);
				}
			})
			.catch(err => {
				return next(err, null);
			});
	});
}

module.exports.unvalidatedFestivalObjectArray = (festivals, sortBy, order, next) => {
	if (festivals.length === 0) return next(null, []);

	let responseFestivals = [];
	festivals.forEach((festival, index1, array1) => {
		unvalidatedFestivalObject(festival, (err, responseFestival) => {
			if (err) return next(err, null);

			responseFestivals.push(responseFestival);

			if (responseFestivals.length === array1.length) {
				responseFestivals.sort((a, b) => {
					if (sortBy === 'city' || sortBy === 'country') {
						if (order === -1) return b.address[sortBy].localeCompare(a.address[sortBy]);
						return a.address[sortBy].localeCompare(b.address[sortBy]);
					}
					if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
					return a[sortBy].localeCompare(b[sortBy]);
				});
				return next(null, responseFestivals);
			}
		});
	});
}

const festivalObject = module.exports.festivalObject = (festival, next) => {
	if (typeof festival == 'string') return next(null, festival);

	let eventList = [];
	let deletedEvents = 0;
	festival.events.forEach((eventID, index2, array2) => {
		FestivalEvent.findOne({ _id: eventID })
			.then(event => {
				UnvalidatedFestivalEvent.findOne({ _id: eventID })
					.then(unvalidatedEvent => {
						if (!event) {
							if (!unvalidatedEvent) eventList.push('Event not found');
							else deletedEvents++;
						}
						else eventList.push(event);

						if (eventList.length + deletedEvents == array2.length) {
							festivalEventObjectArray(eventList, 'startDate', 1, (err, responseEvent) => {
								if (err) return next(err, null);
		
								let genreList = [];
								festival.genre.forEach(genreID => {
									Genre.findOne({ _id: genreID })
										.then(genre => {
											genreList.push(genre.name);
											if (festival.genre.length === genreList.length) {
												genreList.sort((a, b) => {
													return a.localeCompare(b);
												});
												const responseFestival = {
													_id: festival._id,
													title: festival.title,
													url: festival.url,
													description: festival.description,
													genre: genreList,
													events: responseEvent,
													address: festival.address,
													ticketLink: festival.ticketLink,
													website: festival.website,
													facebookUrl: festival.facebookUrl
												};
												return next(null, responseFestival);
											}
										})
										.catch(err => {
											return next(err, null);
										});
								});
							});
						}
					})
					.catch(err => {
						return next(err, null);
					});
			})
			.catch(err => {
				return next(err, null);
			});
	});
}

module.exports.festivalObjectArray = (festivals, sortBy, order, next) => {
	if (festivals.length === 0) return next(null, []);

	let responseFestivals = [];
	festivals.forEach((festival, index1, array1) => {
		festivalObject(festival, (err, responseFestival) => {
			if (err) return next(err, null);

			responseFestivals.push(responseFestival);

			if (responseFestivals.length === array1.length) {
				responseFestivals.sort((a, b) => {
					if (sortBy === 'city' || sortBy === 'country') {
						if (order === -1) return b.address[sortBy].localeCompare(a.address[sortBy]);
						return a.address[sortBy].localeCompare(b.address[sortBy]);
					}
					if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
					return a[sortBy].localeCompare(b[sortBy]);
				});
				return next(null, responseFestivals);
			}
		});
	});
}

const reportObject = module.exports.reportObject = (report, model, next) => {
	if (typeof report == 'string') return next(null, report);

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
			else if (report.category === 'band') {
				bandObject(item, (err, responseItem) => {
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
			else if (report.category === 'festival') {
				festivalObject(item, (err, responseItem) => {
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
		band: [],
		festival: []
	}
	reports.forEach((report, index, array) => {
		let model = Event;
		if (report.category == 'location') model = Location;
		else if (report.category == 'band') model = Band;
		else if (report.category == 'festival') model = Festival;

		reportObject(report, model, (err, responseReport) => {
			if (err) return next(err, null);

			reportList[responseReport.category].push(responseReport);

			if ((reportList.event.length + reportList.location.length + reportList.band.length + reportList.festival.length) == array.length) {
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
				reportList.festival.sort((a, b) => {
					if (order === -1) return b.item.title.localeCompare(a.item.title);
					return a.item.title.localeCompare(b.item.title);
				});
				responseReports = responseReports.concat(reportList.band).concat(reportList.event).concat(reportList.festival).concat(reportList.location);

				return next(null, responseReports);
			}
		});
	});
}