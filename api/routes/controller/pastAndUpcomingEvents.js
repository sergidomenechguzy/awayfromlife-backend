const mongoose = require('mongoose');
const moment = require('moment');

const dereference = require('../../helpers/dereference');
require('../../models/Event');
require('../../models/FestivalEvent');
require('../../models/Festival');

const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const FestivalEvent = mongoose.model('festival_events');
const Festival = mongoose.model('festivals');

function getEvents(type, attribute, id) {
  return new Promise(async (resolve, reject) => {
    try {
      const collection = type === 'past' ? ArchivedEvent : Event;
      const comparison = type === 'past' ? '$lt' : '$gte';
      const order = type === 'past' ? -1 : 1;

      const events = await collection.find({ [attribute]: id });
      let festivalEvents = [];
      if (attribute === 'bands') {
        festivalEvents = await FestivalEvent.find({
          [attribute]: id,
          startDate: { [comparison]: new Date().setUTCHours(0, 0, 0, 0) },
        });
      }
      if (events.length === 0 && festivalEvents.length === 0) {
        return resolve('No events found for this band.');
      }

      const promises = festivalEvents.map(async festivalEvent => {
        const finalFestivalEvent = await dereference.festivalEventObject(festivalEvent);
        const festival = await Festival.findOne({ events: festivalEvent._id });

        finalFestivalEvent.url = festival.url;
        finalFestivalEvent.date = moment(festivalEvent.startDate).format('YYYY-MM-DD');
        finalFestivalEvent.isFestival = true;
        return finalFestivalEvent;
      });
      const festivalEventList = await Promise.all(promises);

      let dereferenced = await dereference.objectArray(events, 'event', false);
      dereferenced = dereferenced.map(event => ({ ...event, isFestival: false }));
      dereferenced = dereferenced.concat(festivalEventList);

      dereferenced = dereference.eventSort(dereferenced, 'date', order);
      return resolve(dereferenced);
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = {
  getEvents,
};
