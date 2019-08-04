const mongoose = require('mongoose');

const dereference = require('../../helpers/dereference');
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
const ArchivedEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Band = mongoose.model('bands');
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
  report: { model: Report, string: 'report' },
};

function addFestivalUrl(objects, category) {
  return new Promise(async (resolve, reject) => {
    try {
      const promises = objects.map(async object => {
        const objectCopy = { ...object };
        let festival = await Festival.findOne({ events: objectCopy._id });
        if (festival === undefined) {
          objectCopy.festival = 'festival-not-found';
          if (category === 'unvalidatedFestivalEvent') {
            festival = await UnvalidatedFestival.findOne({ events: objectCopy._id });
            if (festival !== undefined) {
              objectCopy.festival = await dereference.unvalidatedFestivalObject(festival);
            }
          }
        } else {
          objectCopy.festival = await dereference.unvalidatedFestivalObject(festival);
        }
        return objectCopy;
      });
      const objectList = Promise.all(promises);
      return resolve(objectList);
    } catch (err) {
      return reject(err);
    }
  });
}

// delete object by id from specified collection and delete or update all connected objects
function get(category, count) {
  return new Promise(async (resolve, reject) => {
    try {
      let objects = await categories[category].model.find();

      objects.sort((a, b) => {
        if (a._id.getTimestamp() < b._id.getTimestamp()) {
          return 1;
        }
        return -1;
      });
      objects = objects.slice(0, count);

      if (categories[category].string !== undefined) {
        objects = await dereference.objectArray(objects, categories[category].string, false);
      } else {
        objects = objects.map(object => {
          const copy = JSON.parse(JSON.stringify(object));
          copy._id = object._id;
          return copy;
        });
      }
      if (category === 'festivalEvent' || category === 'unvalidatedFestivalEvent') {
        objects = await addFestivalUrl(objects, category);
      }
      return resolve(objects);
    } catch (err) {
      return reject(err);
    }
  });
}

function getMultiple(categoryList, count) {
  return new Promise(async (resolve, reject) => {
    try {
      const promises = categoryList.map(async category => {
        let result = await get(category, count);
        result = result.map(object => {
          return {
            category,
            data: object,
          };
        });
        return result;
      });
      let results = await Promise.all(promises);
      results = results.reduce((acc, val) => acc.concat(val), []);
      results.sort((a, b) => {
        if (a.data._id.getTimestamp() < b.data._id.getTimestamp()) {
          return 1;
        }
        return -1;
      });
      results = results.slice(0, count);
      return resolve(results);
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = {
  getMultiple,
  get,
};
