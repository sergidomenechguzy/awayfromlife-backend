const mongoose = require('mongoose');

const image = require('../../helpers/image');
require('../../models/Event');
require('../../models/Band');
require('../../models/Location');
require('../../models/Festival');
require('../../models/FestivalEvent');
require('../../models/Report');
require('../../models/Genre');
require('../../models/Bug');
require('../../models/Feedback');

const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');
const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');
const Report = mongoose.model('reports');
const Genre = mongoose.model('genres');
const Bug = mongoose.model('bugs');
const Feedback = mongoose.model('feedback');

function checkVerifiable(location, bands) {
  return new Promise(async (resolve, reject) => {
    try {
      if (location === 'Location was deleted') {
        return resolve(false);
      }
      const foundLocation = await UnvalidatedLocation.findById(location);
      const foundBand = await UnvalidatedBand.findOne({ _id: { $in: bands } });
      if (foundLocation === undefined && foundBand === undefined) {
        return resolve(true);
      }
      return resolve(false);
    } catch (err) {
      return reject(err);
    }
  });
}

function deleteBandFromEventCollection(collection, id, newId) {
  return new Promise(async (resolve, reject) => {
    try {
      const events = await collection.find({ bands: id });
      if (events.length === 0) {
        return resolve();
      }

      const promises = events.map(async event => {
        const eventCopy = { ...event };
        if (newId !== undefined) {
          eventCopy.bands[eventCopy.bands.indexOf(id)] = newId;
        } else {
          eventCopy.bands.splice(eventCopy.bands.indexOf(id), 1);
        }
        eventCopy.verifiable = await checkVerifiable(eventCopy.location, eventCopy.bands);
        const result = await collection.findOneAndUpdate({ _id: eventCopy._id }, eventCopy);
        return result;
      });
      await Promise.all(promises);
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}

function deleteLocationFromEventCollection(collection, id, newId) {
  return new Promise(async (resolve, reject) => {
    try {
      const events = await collection.find({ location: id });
      if (events.length === 0) {
        return resolve();
      }

      const promises = events.map(async event => {
        const eventCopy = { ...event };
        if (newId !== undefined) {
          eventCopy.location = newId;
        } else {
          eventCopy.location = 'Location was deleted';
        }
        eventCopy.verifiable = await checkVerifiable(eventCopy.location, eventCopy.bands);
        const result = await collection.findOneAndUpdate({ _id: eventCopy._id }, eventCopy);
        return result;
      });
      await Promise.all(promises);
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}

function deleteLocationData(id) {
  return new Promise(async (resolve, reject) => {
    try {
      let promises = [Report.remove({ category: 'location', item: id })];
      const events = await Event.find({ location: id });
      promises = promises.concat(
        events.map(async event => {
          const response = await deleteObject(event._id, 'event');
          return response;
        })
      );
      const unvalidatedEvents = await UnvalidatedEvent.find({ location: id });
      promises = promises.concat(
        unvalidatedEvents.map(async event => {
          const response = await deleteObject(event._id, 'unvalidatedEvent');
          return response;
        })
      );
      await Promise.all(promises);
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}

function deleteFestivalData(id, events) {
  return new Promise(async (resolve, reject) => {
    try {
      let promises = [
        Report.remove({ category: 'festival', item: id }),
        UnvalidatedFestivalEvent.remove({ _id: { $in: events } }),
      ];
      const festivalEvents = await FestivalEvent.find({ _id: { $in: events } });
      promises = promises.concat(
        festivalEvents.map(async event => {
          const response = await deleteObject(event._id, 'festivalEvent');
          return response;
        })
      );
      await Promise.all(promises);
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}

// delete object by id from specified collection and delete or update all connected objects
function deleteObject(id, collection) {
  return new Promise(async (resolve, reject) => {
    const categories = {
      event: { model: Event, string: 'Event' },
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
      report: { model: Report, string: 'Report' },
    };

    try {
      const item = await categories[collection].model.findById(id);
      if (!item) {
        return resolve({
          status: 400,
          message: `No ${categories[collection].string.toLowerCase()} found with this ID`,
        });
      }
      await categories[collection].model.remove({ _id: id });
      if (item.image !== undefined) {
        await image.deleteImages(item.image);
      }
      switch (collection) {
        case 'event':
          await Report.remove({ category: 'event', item: id });
          return resolve({ status: 200, message: 'Event deleted' });

        case 'band':
        case 'unvalidatedBand':
          await Promise.all([
            deleteBandFromEventCollection(Event, id),
            deleteBandFromEventCollection(UnvalidatedEvent, id),
            deleteBandFromEventCollection(FestivalEvent, id),
            deleteBandFromEventCollection(UnvalidatedFestivalEvent, id),
            Report.remove({ category: 'band', item: id }),
          ]);
          return resolve({ status: 200, message: 'Band deleted' });

        case 'location':
          await deleteLocationData(id);
          return resolve({ status: 200, message: 'Location deleted' });

        case 'unvalidatedLocation':
          await deleteLocationFromEventCollection(UnvalidatedEvent, id);
          return resolve({ status: 200, message: 'Location deleted' });

        case 'festival':
          await deleteFestivalData(id, item.events);
          return resolve({ status: 200, message: 'Festival deleted' });

        case 'unvalidatedFestival':
          await UnvalidatedFestivalEvent.remove({ _id: { $in: item.events } });
          return resolve({ status: 200, message: 'Festival deleted' });

        case 'festivalEvent':
          const festival = await Festival.findOne({ events: id });
          if (!festival) {
            return resolve({ status: 200, message: 'Festival event deleted' });
          }

          festival.events.splice(festival.events.indexOf(id), 1);
          const festivalEvents = await FestivalEvent.find({ _id: { $in: festival.events } });
          if (festivalEvents.length === 0) {
            await deleteObject(festival._id, 'festival');
            return resolve({ status: 200, message: 'Festival event deleted' });
          }
          await Festival.findOneAndUpdate({ _id: festival._id }, festival);
          return resolve({ status: 200, message: 'Festival event deleted' });

        default:
          return resolve({ status: 200, message: `${categories[collection].string} deleted` });
      }
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = {
  deleteObject,
  deleteBandFromEventCollection,
  deleteLocationFromEventCollection,
};
