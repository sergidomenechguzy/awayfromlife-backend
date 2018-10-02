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

// delete object by id from specified collection and delete or update all connected objects
module.exports.delete = (id, collection) => {
	return new Promise(async (resolve, reject) => {
		const categories = {
			validEvent: { model: Event, string: 'Event' },
			archiveEvent: { model: ArchivedEvent, string: 'Event' },
			unvalidEvent: { model: UnvalidatedEvent, string: 'Event' },
			validLocation: { model: Location, string: 'Location' },
			unvalidLocation: { model: UnvalidatedLocation, string: 'Location' },
			validBand: { model: Band, string: 'Band' },
			unvalidBand: { model: UnvalidatedBand, string: 'Band' },
			validFestival: { model: Festival, string: 'Festival' },
			unvalidFestival: { model: UnvalidatedFestival, string: 'Festival' },
			validFestivalEvent: { model: FestivalEvent, string: 'Festival event' },
			genre: { model: Genre, string: 'Genre' },
			bug: { model: Bug, string: 'Bug' },
			feedback: { model: Feedback, string: 'Feedback' },
			report: { model: Report, string: 'Report' }
		};

		try {
			const item = await categories[collection].model.findById(id);
			if (!item)
				resolve({ status: 400, message: 'No ' + categories[collection].string.toLowerCase() + ' found with this ID' });
			await categories[collection].model.remove({ _id: id });
			switch (collection) {
				case 'validEvent':
					await Report.remove({ category: 'event', item: id });
					resolve({ status: 200, message: 'Event deleted' });
					break;

				case 'validBand':
					await Promise.all([
						deleteBandFromEvents(Event, id),
						deleteBandFromEvents(ArchivedEvent, id),
						deleteBandFromEvents(UnvalidatedEvent, id),
						deleteBandFromEvents(FestivalEvent, id),
						deleteBandFromEvents(UnvalidatedFestivalEvent, id),
						Report.remove({ category: 'band', item: id })
					]);
					resolve({ status: 200, message: 'Band deleted' });
					break;

				case 'validLocation':
					await Promise.all([
						Event.remove({ location: id }),
						ArchivedEvent.remove({ location: id }),
						UnvalidatedEvent.remove({ location: id }),
						Report.remove({ category: 'location', item: id })
					]);
					resolve({ status: 200, message: 'Location deleted' });
					break;

				case 'validFestival':
					await Promise.all([
						FestivalEvent.remove({ _id: { $in: item.events } }),
						UnvalidatedFestivalEvent.remove({ _id: { $in: item.events } }),
						Report.remove({ category: 'festival', item: id })
					]);
					resolve({ status: 200, message: 'Festival deleted' });
					break;

				case 'unvalidFestival':
					await UnvalidatedFestivalEvent.remove({ _id: { $in: item.events } });
					resolve({ status: 200, message: 'Festival deleted' });
					break;

				case 'validFestivalEvent':
					const festival = await Festival.findOne({ events: id });
					if (!festival)
						resolve({ status: 200, message: 'Festival event deleted' });

					festival.events.splice(festival.events.indexOf(id), 1);
					await Festival.findOneAndUpdate({ _id: festival._id }, festival);
					resolve({ status: 200, message: 'Festival event deleted' });
					break;

				default:
					resolve({ status: 200, message: categories[collection].string + ' deleted' });
			}
		}
		catch (err) {
			reject(err);
		}
	});
}

const deleteBandFromEvents = (collection, id, next) => {
	return new Promise(async (resolve, reject) => {
		try {
			const events = await collection.find({ bands: id });
			if (events.length == 0) resolve();

			const promises = events.map(async (event) => {
				event.bands.splice(event.bands.indexOf(id), 1);
				const result = await collection.findOneAndUpdate({ _id: event._id }, event);
				return result;
			});
			await Promise.all(promises);
			resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}