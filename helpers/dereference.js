const mongoose = require('mongoose');

// load event model
require('../models/Event');
const Event = mongoose.model('events');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

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

function objectArray(objects, model, sortBy, order) {
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

function bandObject(band) {
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
				origin: band.origin.default,
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

function eventObject(event) {
	return new Promise(async (resolve, reject) => {
		if (typeof event == 'string') resolve(event);

		try {
			let location;
			if (event.location == 'Location was deleted') location = event.location;
			else {
				location = await Location.findById(event.location);
				let isValidated = true;
				if (!location) {
					location = 'Location not found';
					if (!event.verifiable) {
						const unvalidatedLocation = await UnvalidatedLocation.findById(event.location);
						if (unvalidatedLocation) {
							location = unvalidatedLocation;
							isValidated = false;
						}
					}
				}
				location = await locationObject(location);
				location.isValidated = isValidated;
			}

			const promises = event.bands.map(async (bandID, index) => {
				let result = await Band.findById(bandID);
				let isValidated = true;
				if (!result) {
					result = 'Band not found';
					if (!event.verifiable) {
						const unvalidatedResult = await UnvalidatedBand.findById(bandID);
						if (unvalidatedResult) {
							result = unvalidatedResult;
							isValidated = false;
						}
					}
				}
				let dereferenced = await bandObject(result);
				dereferenced.isValidated = isValidated;
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
				ticketLink: event.ticketLink,
				verifiable: event.verifiable
			};
			resolve(responseEvent);
		}
		catch (err) {
			reject(err);
		}
	});
}

function festivalEventObject(festivalEvent) {
	return new Promise(async (resolve, reject) => {
		if (typeof festivalEvent == 'string') resolve(festivalEvent);

		try {
			const promises = festivalEvent.bands.map(async (bandID, index) => {
				let result = await Band.findById(bandID);
				let isValidated = true;
				if (!result) {
					result = 'Band not found';
					if (!festivalEvent.verifiable) {
						const unvalidatedResult = await UnvalidatedBand.findById(bandID);
						if (unvalidatedResult) {
							result = unvalidatedResult;
							isValidated = false;
						}
					}
				}
				let dereferenced = await bandObject(result);
				dereferenced.isValidated = isValidated;
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
				canceled: festivalEvent.canceled,
				verifiable: festivalEvent.verifiable
			};
			resolve(responseFestivalEvent);
		}
		catch (err) {
			reject(err);
		}
	});
}

function festivalObject(festival) {
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

function locationObject(location) {
	return new Promise(async (resolve, reject) => {
		if (typeof location == 'string') resolve(location);

		try {
			const responseLocation = {
				_id: location._id,
				name: location.name,
				url: location.url,
				address: location.address.default,
				status: location.status,
				information: location.information,
				website: location.website,
				facebookUrl: location.facebookUrl
			};
			resolve(responseLocation);
		}
		catch (err) {
			reject(err);
		}
	});
}

function reportObject(report) {
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

function unvalidatedFestivalObject(unvalidatedFestival) {
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

function bandSort(objectList, sortBy, order) {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (sortBy === 'origin.city') {
			if (order === -1) return b.origin.city.localeCompare(a.origin.city);
			return a.origin.city.localeCompare(b.origin.city);
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

function eventSort(objectList, sortBy, order) {
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

function festivalSort(objectList, sortBy, order) {
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

function festivalEventSort(objectList, sortBy, order) {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
		return a[sortBy].localeCompare(b[sortBy]);
	});
}

function locationSort(objectList, sortBy, order) {
	return objectList.sort((a, b) => {
		if (sortBy == 'street' || sortBy == 'city') {
			if (order === -1) return b.address[sortBy].localeCompare(a.address[sortBy]);
			return a.address[sortBy].localeCompare(b.address[sortBy]);
		}
		if (order === -1) return b[sortBy].localeCompare(a[sortBy]);
		return a[sortBy].localeCompare(b[sortBy]);
	});
}

function reportSort(objectList, sortBy, order) {
	return objectList.sort((a, b) => {
		if (typeof a == 'string') return 1;
		if (typeof b == 'string') return -1;
		if (order === -1) return b.category.localeCompare(a.category);
		return a.category.localeCompare(b.category);
	});
}

module.exports = {
	objectArray: objectArray,
	bandObject: bandObject,
	eventObject: eventObject,
	festivalEventObject: festivalEventObject,
	festivalObject: festivalObject,
	locationObject: locationObject,
	reportObject: reportObject,
	unvalidatedFestival: unvalidatedFestivalObject,
	bandSort: bandSort,
	eventSort: eventSort,
	locationSort: locationSort
};