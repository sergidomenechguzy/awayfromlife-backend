const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require('../models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load band model
require('../models/Band');
const Band = mongoose.model('bands');

// load location model
require('../models/Location');
const Location = mongoose.model('locations');

// load festival model
require('../models/Festival');
const Festival = mongoose.model('festivals');

// load dereference.js
const dereference = require('./dereference');

module.exports.generateUrl = (object, model, urlList) => {
	return new Promise(async (resolve, reject) => {
		const urlListChecked = urlList || [];
		const copiedObject = JSON.parse(JSON.stringify(object));
		copiedObject.url = generateUrlFromObject(object, model);
		try {
			const response = await checkUrl(copiedObject, model, copiedObject.url, urlListChecked, 2);
			resolve(response);
		}
		catch (err) {
			reject(err);
		}
	});
}

const checkUrl = (object, model, url, urlList, counter) => {
	return new Promise(async (resolve, reject) => {
		if (!object) resolve(null);

		const collection = {
			band: Band,
			location: Location,
			festival: Festival
		};

		try {
			if ((urlList.length > 0) && urlList.includes(url)) {
				url = object.url + '--' + counter;
				counter++;
				const response = await checkUrl(object, model, url, urlList, counter);
				resolve(response);
			}

			const savedObject = await collection[model].findOne({ url: url });
			if (!savedObject) {
				object.url = url;
				resolve(object);
			}
			else if (object._id && object._id.toString() == savedObject._id.toString()) {
				object.url = url;
				resolve(object);
			}
			else {
				url = object.url + '--' + counter;
				counter++;
				const response = await checkUrl(object, model, url, urlList, counter);
				resolve(response);
			}

		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports.generateEventUrl = (object, model, urlList) => {
	return new Promise(async (resolve, reject) => {
		const urlListChecked = urlList || [];
		try {
			const copiedObject = JSON.parse(JSON.stringify(object));
			const dereferenced = await dereference.eventObject(object);
			copiedObject.url = generateUrlFromObject(dereferenced, model);
			// const copiedObject = generateEventUrlFromObject(object, dereferenced.location.name);
			const response = await checkEventUrl(copiedObject, model, copiedObject.url, urlListChecked, 2);
			resolve(response);
		}
		catch (err) {
			reject(err);
		}
	});
}

const checkEventUrl = (object, model, url, urlList, counter) => {
	return new Promise(async (resolve, reject) => {
		if (!object) resolve(null);

		try {
			if ((urlList.length > 0) && urlList.includes(url)) {
				url = object.url + '--' + counter;
				counter++;
				const response = await checkEventUrl(object, model, url, urlList, counter);
				resolve(response);
			}

			const savedEvent = await Event.findOne({ url: url });
			if (savedEvent != undefined) {
				if (object._id && model == 'event' && object._id.toString() == savedEvent._id.toString()) {
					object.url = url;
					resolve(object);
				}
				else {
					url = object.url + '--' + counter;
					counter++;
					const response = await checkEventUrl(object, model, url, urlList, counter);
					resolve(response);
				}
			}
			else {
				const savedArchivedEvent = await ArchivedEvent.findOne({ url: url });
				if (savedArchivedEvent != undefined) {
					if (object._id && model == 'archive' && object._id.toString() == savedArchivedEvent._id.toString()) {
						object.url = url;
						resolve(object);
					}
					else {
						url = object.url + '--' + counter;
						counter++;
						const response = await checkEventUrl(object, model, url, urlList, counter);
						resolve(response);
					}
				}
				else {
					object.url = url;
					resolve(object);
				}
			}
		}
		catch (err) {
			reject(err);
		}
	});
}

const generateUrlFromObject = (object, type) => {
	let url = '';
	
	switch (type) {
		case 'location':
			url = object.name + '--' + object.address.city;
			break;
		case 'event':
		case 'archive':
		case 'unvalidated':
			url = object.name + '--' + moment(object.date).format('DD-MM-YYYY') + '--' + object.location.name;
			break;
		default:
			url = object.name;
	}
	url = deUmlaut(url);
	return url;
}

const deUmlaut = (value) => {
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
	value = value.replace(/\//g, '-');
	return value;
}