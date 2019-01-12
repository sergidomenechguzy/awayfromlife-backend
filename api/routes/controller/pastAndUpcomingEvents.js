const mongoose = require('mongoose');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load event model
require(dirPath + '/api/models/Festival_Event');
const FestivalEvent = mongoose.model('festival_events');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');

// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');

function getEvents(type, attribute, id) {
	return new Promise(async (resolve, reject) => {
		try {
			const collection = type == 'past' ? ArchivedEvent : Event;
			const comparison = type == 'past' ? '$lt' : '$gte';
			const order = type == 'past' ? -1 : 1;

			const events = await collection.find({ [attribute]: id });
			let festivalEvents = [];
			if (attribute == 'bands')
				festivalEvents = await FestivalEvent.find({ [attribute]: id, startDate: { [comparison]: new Date().setUTCHours(0, 0, 0, 0) } });
			if (events.length == 0 && festivalEvents.length == 0)
				resolve('No events found for this band.');

			const promises = festivalEvents.map(async (festivalEvent) => {
				let finalFestivalEvent = await dereference.festivalEventObject(festivalEvent);
				const festival = await Festival.findOne({ events: festivalEvent._id });

				finalFestivalEvent.url = festival.url;
				finalFestivalEvent.date = festivalEvent.startDate;
				finalFestivalEvent.isFestival = true;
				return finalFestivalEvent;
			});
			const festivalEventList = await Promise.all(promises);

			let dereferenced = await dereference.objectArray(events, 'event', false);
			dereferenced = dereferenced.map(event => {
				event.isFestival = false;
				return event;
			});
			dereferenced = dereferenced.concat(festivalEventList);

			dereferenced = dereference.eventSort(dereferenced, 'date', order);
			resolve(dereferenced);
		}
		catch (err) {
			reject(err);	
		}
	});
}

module.exports = {
	getEvents: getEvents,
};