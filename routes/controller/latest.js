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

// delete object by id from specified collection and delete or update all connected objects
module.exports.get = (category, count) => {
	return new Promise(async (resolve, reject) => {
		const categories = {
			validEvent: { model: Event, string: 'event' },
			archiveEvent: { model: ArchivedEvent, string: 'event' },
			unvalidEvent: { model: UnvalidatedEvent, string: 'event' },
			validLocation: { model: Location, string: 'location' },
			unvalidLocation: { model: UnvalidatedLocation, string: 'location' },
			validBand: { model: Band, string: 'band' },
			unvalidBand: { model: UnvalidatedBand, string: 'band' },
			validFestival: { model: Festival, string: 'festival' },
			unvalidFestival: { model: UnvalidatedFestival, string: 'unvalidatedFestival' },
			validFestivalEvent: { model: FestivalEvent, string: 'festivalEvent' },
			unvalidFestivalEvent: { model: UnvalidatedFestivalEvent, string: 'festivalEvent' },
			genre: { model: Genre },
			bug: { model: Bug },
			feedback: { model: Feedback },
			report: { model: Report, string: 'report' }
		};

		try {
			let objects = await categories[category].model.find();
			
			objects.sort((a, b) => {
				if (a._id.getTimestamp() < b._id.getTimestamp()) return 1;
				else return -1;
			});
			objects = objects.slice(0, count);
			if (categories[category].string != undefined) objects = await dereference.objectArray(objects, categories[category].string, false);
			resolve(objects);
		}
		catch (err) {
			reject(err);
		}
	});
}