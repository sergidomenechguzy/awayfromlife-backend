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

// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');

const categories = {
	event: Event,
	archivedEvent: ArchivedEvent,
	unvalidatedEvent: UnvalidatedEvent,
	location: Location,
	unvalidatedLocation: UnvalidatedLocation,
	band: Band,
	unvalidatedBand: UnvalidatedBand,
	festival: Festival,
	unvalidatedFestival: UnvalidatedFestival,
	festivalEvent: FestivalEvent,
	unvalidatedFestivalEvent: UnvalidatedFestivalEvent,
};

function updateMultiple(updateCategories) {
	return new Promise(async (resolve, reject) => {
		const categoryList = updateCategories ? updateCategories : Object.keys(categories);
		try {
			const promises = categoryList.map(async (category) => {
				try {
					const result = await update(category);
					return result;
				}
				catch (err) {
					reject(err);
				}
			});
			const results = await Promise.all(promises);
			return resolve(results);
		}
		catch (err) {
			reject(err);
		}
	});
}

function update(category) {
	return new Promise(async (resolve, reject) => {
		try {
			let objects = await categories[category].find();

			const promises = objects.map(async object => {
				try {
					let update = JSON.parse(JSON.stringify(object));
					update.imageSource = '';
					update.lastModified = Date.now();

					let updated = await categories[category].findOneAndUpdate({ _id: update._id }, update, { new: true });
					updated = { category, updated };
					return updated;
				}
				catch (err) {
					reject(err);
				}
			});
			const updatedObjects = await Promise.all(promises);
			return resolve(updatedObjects);
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	updateMultiple: updateMultiple,
};