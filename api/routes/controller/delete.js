const mongoose = require('mongoose');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load festival event model
require(dirPath + '/api/models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// load report model
require(dirPath + '/api/models/Report');
const Report = mongoose.model('reports');

// load gernre model
require(dirPath + '/api/models/Genre');
const Genre = mongoose.model('genres');

// load bug model
require(dirPath + '/api/models/Bug');
const Bug = mongoose.model('bugs');

// load feedback model
require(dirPath + '/api/models/Feedback');
const Feedback = mongoose.model('feedback');

// load image.js
const image = require(dirPath + '/api/helpers/image');

// delete object by id from specified collection and delete or update all connected objects
function deleteObject(id, collection) {
	return new Promise(async (resolve, reject) => {
		const categories = {
			event: { model: Event, string: 'Event' },
			archivedEvent: { model: ArchivedEvent, string: 'Event' },
			unvalidatedEvent: { model: UnvalidatedEvent, string: 'Event' },
			location: { model: Location, string: 'Location' },
			unvalidatedLocation: { model: UnvalidatedLocation, string: 'Location' },
			band: { model: Band, string: 'Band' },
			unvalidatedBand: { model: UnvalidatedBand, string: 'Band' },
			festival: { model: Festival, string: 'Festival' },
			unvalidatedFestival: { model: UnvalidatedFestival, string: 'Festival' },
			festivalEvent: { model: FestivalEvent, string: 'Festival event' },
			genre: { model: Genre, string: 'Genre' },
			bug: { model: Bug, string: 'Bug' },
			feedback: { model: Feedback, string: 'Feedback' },
			report: { model: Report, string: 'Report' }
		};

		try {
			const item = await categories[collection].model.findById(id);
			if (!item)
				return resolve({ status: 400, message: 'No ' + categories[collection].string.toLowerCase() + ' found with this ID' });
			await categories[collection].model.remove({ _id: id });
			if (item.image != undefined)
				await image.deleteImages(item.image);
			switch (collection) {
				case 'event':
					await Report.remove({ category: 'event', item: id });
					return resolve({ status: 200, message: 'Event deleted' });
					break;

				case 'band':
				case 'unvalidatedBand':
					await Promise.all([
						deleteBandFromEventCollection(Event, id),
						deleteBandFromEventCollection(ArchivedEvent, id),
						deleteBandFromEventCollection(UnvalidatedEvent, id),
						deleteBandFromEventCollection(FestivalEvent, id),
						deleteBandFromEventCollection(UnvalidatedFestivalEvent, id),
						Report.remove({ category: 'band', item: id })
					]);
					return resolve({ status: 200, message: 'Band deleted' });
					break;

				case 'location':
					await deleteLocationData(id);
					return resolve({ status: 200, message: 'Location deleted' });
					break;

				case 'unvalidatedLocation':
					await deleteLocationFromEventCollection(UnvalidatedEvent, id);
					return resolve({ status: 200, message: 'Location deleted' });
					break;

				case 'festival':
					await deleteFestivalData(id, item.events);
					return resolve({ status: 200, message: 'Festival deleted' });
					break;

				case 'unvalidatedFestival':
					await UnvalidatedFestivalEvent.remove({ _id: { $in: item.events } });
					return resolve({ status: 200, message: 'Festival deleted' });
					break;

				case 'festivalEvent':
					const festival = await Festival.findOne({ events: id });
					if (!festival)
						return resolve({ status: 200, message: 'Festival event deleted' });

					festival.events.splice(festival.events.indexOf(id), 1);
					const festivalEvents = await FestivalEvent.find({ _id: { $in: festival.events } });
					if (festivalEvents.length == 0) {
						await deleteObject(festival._id, 'festival');
						return resolve({ status: 200, message: 'Festival event deleted' });
					}
					else {
						await Festival.findOneAndUpdate({ _id: festival._id }, festival);
						return resolve({ status: 200, message: 'Festival event deleted' });
					}
					break;

				default:
					return resolve({ status: 200, message: categories[collection].string + ' deleted' });
			}
		}
		catch (err) {
			reject(err);
		}
	});
}

function deleteBandFromEventCollection(collection, id, newId) {
	return new Promise(async (resolve, reject) => {
		try {
			const events = await collection.find({ bands: id });
			if (events.length == 0) return resolve();

			const promises = events.map(async (event) => {
				if (newId != undefined) event.bands[event.bands.indexOf(id)] = newId;
				else event.bands.splice(event.bands.indexOf(id), 1);
				event.verifiable = await checkVerifiable(event.location, event.bands);
				const result = await collection.findOneAndUpdate({ _id: event._id }, event);
				return result;
			});
			await Promise.all(promises);
			return resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

function deleteLocationFromEventCollection(collection, id, newId) {
	return new Promise(async (resolve, reject) => {
		try {
			const events = await collection.find({ location: id });
			if (events.length == 0) return resolve();

			const promises = events.map(async (event) => {
				if (newId != undefined) event.location = newId;
				else event.location = 'Location was deleted';
				event.verifiable = await checkVerifiable(event.location, event.bands);
				const result = await collection.findOneAndUpdate({ _id: event._id }, event);
				return result;
			});
			await Promise.all(promises);
			return resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

function checkVerifiable(location, bands) {
	return new Promise(async (resolve, reject) => {
		try {
			if (location == 'Location was deleted') return resolve(false);
			const foundLocation = await UnvalidatedLocation.findById(location);
			const foundBand = await UnvalidatedBand.findOne({ _id: { $in: bands } });
			if (foundLocation == undefined && foundBand == undefined) return resolve(true);
			else return resolve(false);
		}
		catch (err) {
			reject(err);
		}
	});
}

function deleteLocationData(id) {
	return new Promise(async (resolve, reject) => {
		try {
			let promises = [Report.remove({ category: 'location', item: id })];
			const events = await Event.find({ location: id });
			promises = promises.concat(events.map(async (event) => {
				const response = await deleteObject(event._id, 'event');
				return response;
			}));
			const archivedEvents = await ArchivedEvent.find({ location: id });
			promises = promises.concat(archivedEvents.map(async (event) => {
				const response = await deleteObject(event._id, 'archivedEvent');
				return response;
			}));
			const unvalidatedEvents = await UnvalidatedEvent.find({ location: id });
			promises = promises.concat(unvalidatedEvents.map(async (event) => {
				const response = await deleteObject(event._id, 'unvalidatedEvent');
				return response;
			}));
			await Promise.all(promises);
			return resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

function deleteFestivalData(id, events) {
	return new Promise(async (resolve, reject) => {
		try {
			let promises = [
				Report.remove({ category: 'festival', item: id }),
				UnvalidatedFestivalEvent.remove({ _id: { $in: events } })
			];
			const festivalEvents = await FestivalEvent.find({ _id: { $in: events } });
			promises = promises.concat(festivalEvents.map(async (event) => {
				const response = await deleteObject(event._id, 'festivalEvent');
				return response;
			}));
			await Promise.all(promises);
			return resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	deleteObject: deleteObject,
	deleteBandFromEventCollection: deleteBandFromEventCollection,
	deleteLocationFromEventCollection: deleteLocationFromEventCollection
};