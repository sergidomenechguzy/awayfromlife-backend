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

const objectArray = module.exports.objectArray = (objects, model, sortBy, order) => {
	return new Promise(async (resolve, reject) => {
		if (objects.length === 0) resolve([]);

		const functions = {
			band: bandObject,
			event: eventObject,
			festivalEvent: festivalEventObject,
			festival: festivalObject,
			location: locationObject,
			report: reportObject,
			unvalidatedFestival: unvalidatedFestivalObject
		};
		const sort = {
			band: bandSort,
			event: eventSort,
			festivalEvent: festivalEventSort,
			festival: festivalSort,
			location: locationSort,
			report: reportSort,
			unvalidatedFestival: festivalSort
		};

		try {
			const promises = objects.map(async (object) => {
				const result = await functions[model](object);
				return result;
			});
			let objectList = await Promise.all(promises);
			if (sortBy != false)
				objectList = sort[model](objectList, sortBy, order);

			resolve(objectList);
		}
		catch (err) {
			reject(err);
		}
	});
}

const bandObject = module.exports.bandObject = (band) => {
	return new Promise(async (resolve, reject) => {
		if (typeof band == 'string') resolve(band);

		try {
			const promises = band.genre.map(async (genreID) => {
				let result = await Genre.findById(genreID);
				if (!result) result = 'Genre not found';
				return result.name;
			});
			const genreList = await Promise.all(promises);

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
				website: band.website,
				website: band.website,
				bandcampUrl: band.bandcampUrl,
				soundcloudUrl: band.soundcloudUrl,
				facebookUrl: band.facebookUrl
			};
			resolve(responseBand);
		}
		catch (err) {
			reject(err);
		}
	});
}

const eventObject = module.exports.eventObject = (event) => {
	return new Promise(async (resolve, reject) => {
		if (typeof event == 'string') resolve(event);

		try {
			let location = await Location.findById(event.location);
			if (!location) location = 'Location not found';
			location = await locationObject(location);

			// if (event.bands.length === 0) {
			// 	const responseEvent = {
			// 		_id: event._id,
			// 		name: event.name,
			// 		url: event.url,
			// 		description: event.description,
			// 		location: location,
			// 		date: event.date,
			// 		time: event.time,
			// 		bands: [],
			// 		canceled: event.canceled,
			// 		ticketLink: event.ticketLink
			// 	};
			// 	resolve(responseEvent);
			// }

			const promises = event.bands.map(async (bandID, index) => {
				let result = await Band.findById(bandID);
				if (!result) result = 'Band not found';
				const dereferenced = await bandObject(result);
				return { band: dereferenced, index: index };
			});
			const bandList = await Promise.all(promises);
			let bandListSorted = [];
			bandList.forEach(bandObject => {
				bandListSorted[bandObject.index] = bandObject.band;
			});

			const responseEvent = {
				_id: event._id,
				name: event.name,
				url: event.url,
				description: event.description,
				location: location,
				date: event.date,
				time: event.time,
				bands: bandListSorted,
				canceled: event.canceled,
				ticketLink: event.ticketLink
			};
			resolve(responseEvent);
		}
		catch (err) {
			reject(err);
		}
	});
}

const festivalEventObject = module.exports.festivalEventObject = (festivalEvent) => {
	return new Promise(async (resolve, reject) => {
		if (typeof festivalEvent == 'string') resolve(festivalEvent);

		try {
			const promises = festivalEvent.bands.map(async (bandID, index) => {
				let result = await Band.findById(bandID);
				if (!result) result = 'Band not found';
				const dereferenced = await bandObject(result);
				return { band: dereferenced, index: index };
			});
			const bandList = await Promise.all(promises);
			let bandListSorted = [];
			bandList.forEach(bandObject => {
				bandListSorted[bandObject.index] = bandObject.band;
			});

			const responseFestivalEvent = {
				_id: festivalEvent._id,
				name: festivalEvent.name,
				startDate: festivalEvent.startDate,
				endDate: festivalEvent.endDate,
				bands: bandListSorted,
				canceled: festivalEvent.canceled
			};
			resolve(responseFestivalEvent);
		}
		catch (err) {
			reject(err);
		}
	});
}

const festivalObject = module.exports.festivalObject = (festival) => {
	return new Promise(async (resolve, reject) => {
		if (typeof festival == 'string') resolve(festival);

		try {
			const genrePromises = festival.genre.map(async (genreID) => {
				let result = await Genre.findById(genreID);
				if (!result) result = 'Genre not found';
				return result.name;
			});
			const genreList = await Promise.all(genrePromises);

			genreList.sort((a, b) => {
				return a.localeCompare(b);
			});

			const eventPromises = festival.events.map(async (eventID) => {
				let result1 = await FestivalEvent.findById(eventID);
				let result2 = await UnvalidatedFestivalEvent.findById(eventID);
				if (!result1) {
					if (!result2) return 'Event not found';
					else return;
				}
				return result1;
			});
			const festivalEventList = await Promise.all(eventPromises);
			const dereferenced = await objectArray(festivalEventList.filter(event => event != undefined), 'festivalEvent', 'startDate', 1);

			const responseFestival = {
				_id: festival._id,
				name: festival.name,
				url: festival.url,
				description: festival.description,
				genre: genreList,
				events: dereferenced,
				address: festival.address.default,
				ticketLink: festival.ticketLink,
				website: festival.website,
				facebookUrl: festival.facebookUrl
			};
			resolve(responseFestival);
		}
		catch (err) {
			reject(err);
		}
	});
}

const locationObject = module.exports.locationObject = (location) => {
	return new Promise(async (resolve, reject) => {
		if (typeof location == 'string') resolve(location);

		try {
			let responseLocation = JSON.parse(JSON.stringify(location));
			responseLocation.address = location.address.default;
			resolve(responseLocation);
		}
		catch (err) {
			reject(err);
		}
	});
}

const reportObject = module.exports.reportObject = (report) => {
	return new Promise(async (resolve, reject) => {
		if (typeof report == 'string') resolve(report);

		const model = {
			band: Band,
			event: Event,
			festival: Festival,
			location: Location
		};
		const functions = {
			band: bandObject,
			event: eventObject,
			festival: festivalObject,
			location: locationObject
		};

		try {
			const object = await model[report.category].findById(report.item);
			const dereferenced = await functions[report.category](object);

			responseReport = {
				_id: report._id,
				category: report.category,
				item: dereferenced,
				description: report.description
			}
			resolve(responseReport);
		}
		catch (err) {
			reject(err);
		}
	});
}

// module.exports.reportObjectArray = (reports, order, next) => {
// 	if (reports.length === 0) return next(null, []);

// 	let responseReports = [];
// 	let reportList = {
// 		event: [],
// 		location: [],
// 		band: [],
// 		festival: []
// 	}
// 	reports.forEach((report, index, array) => {
// 		let model = Event;
// 		if (report.category == 'location') model = Location;
// 		else if (report.category == 'band') model = Band;
// 		else if (report.category == 'festival') model = Festival;

// 		reportObject(report, model, (err, responseReport) => {
// 			if (err) return next(err, null);

// 			reportList[responseReport.category].push(responseReport);

// 			if ((reportList.event.length + reportList.location.length + reportList.band.length + reportList.festival.length) == array.length) {
// 				reportList.event.sort((a, b) => {
// 					if (order === -1) return b.item.name.localeCompare(a.item.name);
// 					return a.item.name.localeCompare(b.item.name);
// 				});
// 				reportList.location.sort((a, b) => {
// 					if (order === -1) return b.item.name.localeCompare(a.item.name);
// 					return a.item.name.localeCompare(b.item.name);
// 				});
// 				reportList.band.sort((a, b) => {
// 					if (order === -1) return b.item.name.localeCompare(a.item.name);
// 					return a.item.name.localeCompare(b.item.name);
// 				});
// 				reportList.festival.sort((a, b) => {
// 					if (order === -1) return b.item.name.localeCompare(a.item.name);
// 					return a.item.name.localeCompare(b.item.name);
// 				});
// 				responseReports = responseReports.concat(reportList.band).concat(reportList.event).concat(reportList.festival).concat(reportList.location);

// 				return next(null, responseReports);
// 			}
// 		});
// 	});
// }

const unvalidatedFestivalObject = module.exports.unvalidatedFestivalObject = (unvalidatedFestival) => {
	return new Promise(async (resolve, reject) => {
		if (typeof unvalidatedFestival == 'string') resolve(unvalidatedFestival);

		try {
			const promises = unvalidatedFestival.genre.map(async (genreID) => {
				let result = await Genre.findById(genreID);
				if (!result) result = 'Genre not found';
				return result.name;
			});
			const genreList = await Promise.all(promises);

			genreList.sort((a, b) => {
				return a.localeCompare(b);
			});

			const responseFestival = {
				_id: unvalidatedFestival._id,
				name: unvalidatedFestival.name,
				url: unvalidatedFestival.url,
				description: unvalidatedFestival.description,
				genre: genreList,
				events: unvalidatedFestival.events,
				address: unvalidatedFestival.address,
				ticketLink: unvalidatedFestival.ticketLink,
				website: unvalidatedFestival.website,
				facebookUrl: unvalidatedFestival.facebookUrl
			};
			resolve(responseFestival);
		}
		catch (err) {
			reject(err);
		}
	});
}

const bandSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (sortBy === 'origin.name') {
			if (order === -1) return b.origin.name.localeCompare(a.origin.name);
			return a.origin.name.localeCompare(b.origin.name);
		}
		else if (sortBy === 'genre') {
			if (order === -1)
				return b.genre.reduce((x, y) => x < y ? x : y).localeCompare(a.genre.reduce((x, y) => x < y ? x : y));
			return a.genre.reduce((x, y) => x < y ? x : y).localeCompare(b.genre.reduce((x, y) => x < y ? x : y));
		}
		else {
			if (order === -1) return b.name.localeCompare(a.name);
			return a.name.localeCompare(b.name);
		}
	});
}

const eventSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (sortBy === 'location') {
			if (order === -1) return b[sortBy].name.localeCompare(a[sortBy].name);
			return a[sortBy].name.localeCompare(b[sortBy].name);
		}
		else if (sortBy === 'date') {
			if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
			return a[sortBy].localeCompare(b[sortBy]);
		}
		else {
			if (order === -1) return b.name.localeCompare(a.name);
			return a.name.localeCompare(b.name);
		}
	});
}

const festivalSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (sortBy === 'city' || sortBy === 'country') {
			if (order === -1) return b.address[sortBy].localeCompare(a.address[sortBy]);
			return a.address[sortBy].localeCompare(b.address[sortBy]);
		}
		else {
			if (order === -1) return b.name.localeCompare(a.name);
			return a.name.localeCompare(b.name);
		}
	});
}

const festivalEventSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
		return a[sortBy].localeCompare(b[sortBy]);
	});
}

const locationSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (sortBy == 'street' || sortBy == 'city') {
			if (order === -1) return b.address[sortBy].localeCompare(a.address[sortBy]);
			return a.address[sortBy].localeCompare(b.address[sortBy]);
		}
		if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
		return a[sortBy].localeCompare(b[sortBy]);
	});
}

const reportSort = (objectList, sortBy, order) => {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (order === -1) return b.category.localeCompare(a.category);
		return a.category.localeCompare(b.category);
	});
}