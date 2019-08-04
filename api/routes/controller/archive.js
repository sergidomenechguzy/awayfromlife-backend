const mongoose = require('mongoose');
const moment = require('moment');

require('../../models/Event');

const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

function events() {
  return new Promise(async (resolve, reject) => {
    try {
      const eventsList = await Event.find({
        date: { $lt: new Date(moment().format('YYYY-MM-DD')) },
      });
      if (eventsList.length === 0) {
        return resolve(eventsList);
      }

      const promises = eventsList.map(async object => {
        await Event.remove({ _id: object._id });
        const newEvent = {
          name: object.name,
          url: object.url,
          description: object.description,
          location: object.location,
          date: object.date,
          time: object.time,
          bands: object.bands,
          canceled: object.canceled,
          ticketLink: object.ticketLink,
          verifiable: object.verifiable,
          image: object.image,
          imageSource: object.imageSource,
          lastModified: object.lastModified,
        };
        const saved = await new ArchivedEvent(newEvent).save();
        return saved;
      });
      const objectList = await Promise.all(promises);
      return resolve(objectList);
    } catch (err) {
      return reject(err);
    }
  });
}

module.exports = {
  events,
};
