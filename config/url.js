const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load dereference.js
const dereference = require('../config/dereference');

module.exports.generateUrl = (object, model, next) => {
	let url = '';
	if (object.title) url = object.title;
	else {
		url = object.name;
		if (object.address) url = url + '--' + object.address.city;
	}
	url = deUmlaut(url);
	let copiedObject = JSON.parse(JSON.stringify(object));
	copiedObject.url = url;
	checkUrl(copiedObject, model, url, 2, next);
}

const checkUrl = (object, model, url, counter, next) => {
	if (!object) return next(null, null);

	model.findOne({ url: url })
		.then(savedObject => {
			if (!savedObject) {
				object.url = url;
				return next(null, object);
			}
			else if (object._id && object._id.toString() == savedObject._id.toString()) {
				object.url = url;
				return next(null, object);
			}
			else {
				url = object.url + '--' + counter;
				counter++;
				checkUrl(object, model, url, counter, (err, responseObject) => {
					if (err) return next(err, null);
					return next(null, responseObject);
				});
			}
		})
		.catch(err => {
			return next(err, null);
		});
}

module.exports.generateEventUrl = (object, model, next) => {
	dereference.eventObject(object, (err, responseEvent) => {
		if (err) return next(err, null);
		let url = object.title + '--' + moment(object.startDate).format('DD-MM-YYYY') + '--' + responseEvent.location.name;
		url = deUmlaut(url);
		let copiedObject = JSON.parse(JSON.stringify(object));
		copiedObject.url = url;
		checkEventUrl(copiedObject, model, url, 2, next);
	});
}

const checkEventUrl = (object, model, url, counter, next) => {
	if (!object) return next(null, null);

	Event.findOne({ url: url })
		.then(savedObject1 => {
			if (!!savedObject1) {
				if (object._id && model == 'event' && object._id.toString() == savedObject1._id.toString()) {
					object.url = url;
					return next(null, object);
				}
				else {
					url = object.url + '--' + counter;
					counter++;
					checkEventUrl(object, model, url, counter, (err, responseObject) => {
						if (err) return next(err, null);
						return next(null, responseObject);
					});
				}
			}
			else {
				ArchivedEvent.findOne({ url: url })
					.then(savedObject2 => {
						if (!!savedObject2) {
							if (object._id && model == 'archive' && object._id.toString() == savedObject2._id.toString()) {
								object.url = url;
								return next(null, object);
							}
							else {
								url = object.url + '--' + counter;
								counter++;
								checkEventUrl(object, model, url, counter, (err, responseObject) => {
									if (err) return next(err, null);
									return next(null, responseObject);
								});
							}
						}
						else {
							object.url = url;
							return next(null, object);
						}
					})
					.catch(err => {
						return next(err, null);
					});
			}
		})
		.catch(err => {
			return next(err, null);
		});
}

function deUmlaut(value) {
	value = value.replace(/ä/g, 'ae');
	value = value.replace(/ö/g, 'oe');
	value = value.replace(/ü/g, 'ue');
	value = value.replace(/Ä/g, 'Ae');
	value = value.replace(/Ö/g, 'Oe');
	value = value.replace(/Ü/g, 'Ue');
	value = value.replace(/ß/g, 'ss');
	value = value.replace(/ - /g, '-');
	value = value.replace(/ /g, '-');
	value = value.replace(/\./g, '');
	value = value.replace(/,/g, '');
	value = value.replace(/\(/g, '');
	value = value.replace(/\)/g, '');
	value = value.replace(/\//g, '');
	return value;
}