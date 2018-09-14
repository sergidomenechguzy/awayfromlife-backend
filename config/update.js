const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchiveEvent = mongoose.model('archived_events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');

module.exports.updateDate = () => {
	Event.find()
		.then(events1 => {
			events1.forEach(event1 => {
				let update1 = JSON.parse(JSON.stringify(event1));
				update1.date = moment(update1.startDate).format('YYYY-MM-DD');
				update1.time = '';
				update1.lastModified = Date.now();

				// console.log(event1.startDate);
				// console.log(update1.date);
				
				Event.findOneAndUpdate({ _id: update1._id }, update1, (err, save1) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
					}
					console.log('NORMAL: ' + save1.title + ' updated');
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
	ArchiveEvent.find()
		.then(events2 => {
			events2.forEach(event2 => {
				let update2 = JSON.parse(JSON.stringify(event2));
				update2.date = update2.startDate;
				update2.time = '';
				update2.lastModified = Date.now();

				ArchiveEvent.findOneAndUpdate({ _id: update2._id }, update2, (err, save2) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
					}
					console.log('ARCHIVE: ' + save2.title + ' updated');
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
	UnvalidatedEvent.find()
		.then(events3 => {
			events3.forEach(event3 => {
				let update3 = JSON.parse(JSON.stringify(event3));
				update3.date = update3.startDate;
				update3.time = '';
				update3.lastModified = Date.now();

				UnvalidatedEvent.findOneAndUpdate({ _id: update3._id }, update3, (err, save3) => {
					if (err) {
						console.log(err.name + ': ' + err.message);
					}
					console.log('UNVALID: ' + save3.title + ' updated');
				});
			});
		})
		.catch(err => {
			console.log(err.name + ': ' + err.message);
		});
}