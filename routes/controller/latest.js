const mongoose = require('mongoose');

// load event model
require('../../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

// load band model
require('../../models/Band');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');

// load location model
require('../../models/Location');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// load festival model
require('../../models/Festival');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');

// load festival event model
require('../../models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

// load report model
require('../../models/Report');
const Report = mongoose.model('reports');

// load gernre model
require('../../models/Genre');
const Genre = mongoose.model('genres');

// load bug model
require('../../models/Bug');
const Bug = mongoose.model('bugs');

// load feedback model
require('../../models/Feedback');
const Feedback = mongoose.model('feedback');

// load dereference.js
const dereference = require('../../helpers/dereference');

const categories = {
	event: { model: Event, string: 'event' },
	archivedEvent: { model: ArchivedEvent, string: 'event' },
	unvalidatedEvent: { model: UnvalidatedEvent, string: 'event' },
	location: { model: Location, string: 'location' },
	unvalidatedLocation: { model: UnvalidatedLocation, string: 'location' },
	band: { model: Band, string: 'band' },
	unvalidatedBand: { model: UnvalidatedBand, string: 'band' },
	festival: { model: Festival, string: 'festival' },
	unvalidatedFestival: { model: UnvalidatedFestival, string: 'unvalidatedFestival' },
	festivalEvent: { model: FestivalEvent, string: 'festivalEvent' },
	unvalidatedFestivalEvent: { model: UnvalidatedFestivalEvent, string: 'festivalEvent' },
	genre: { model: Genre },
	bug: { model: Bug },
	feedback: { model: Feedback },
	report: { model: Report, string: 'report' }
};

function getMultiple(categoryList, count) {
	return new Promise(async (resolve, reject) => {
		try {
			const promises = categoryList.map(async (category) => {
				let result = await get(category, count);
				result = result.map(object => {
					object.collection = category;
					return object;
				});
				return result;
			});
			let results = await Promise.all(promises);
			results = results.reduce((acc, val) => acc.concat(val), []);
			results.sort((a, b) => {
				if (a._id.getTimestamp() < b._id.getTimestamp()) return 1;
				else return -1;
			});
			results = results.slice(0, count);
			resolve(results);
		}
		catch (err) {
			reject(err);
		}
	});
}

// delete object by id from specified collection and delete or update all connected objects
function get(category, count) {
	return new Promise(async (resolve, reject) => {
		try {
			let objects = await categories[category].model.find();

			objects.sort((a, b) => {
				if (a._id.getTimestamp() < b._id.getTimestamp()) return 1;
				else return -1;
			});
			objects = objects.slice(0, count);

			if (categories[category].string != undefined)
				objects = await dereference.objectArray(objects, categories[category].string, false);
			else {
				objects = objects.map(object => {
					let copy = JSON.parse(JSON.stringify(object));
					copy._id = object._id;
					return copy;
				});
			}
			if (category == 'festivalEvent' || category == 'unvalidatedFestivalEvent') {
				objects = await addFestivalUrl(objects, category);
			}
			resolve(objects);
		}
		catch (err) {
			reject(err);
		}
	});
}

function addFestivalUrl(objects, category) {
	return new Promise(async (resolve, reject) => {
		try {
			const promises = objects.map(async (object) => {
				let festival = await Festival.findOne({ events: object._id });
				if (festival == undefined) {
					object.url = 'festival-not-found';
					if (category == 'unvalidatedFestivalEvent') {
						festival = await UnvalidatedFestival.findOne({ events: object._id });
						if (festival != undefined) object.url = festival.url;
					}
				}
				else object.url = festival.url;
				return object;
			});
			const objectList = Promise.all(promises);
			resolve(objectList);
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	getMultiple: getMultiple,
	get: get
};