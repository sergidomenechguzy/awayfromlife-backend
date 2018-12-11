const mongoose = require('mongoose');
const moment = require('moment');

// load event model
require(dirPath + '/api/models/Event');
const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');

// load band model
require(dirPath + '/api/models/Band');
const Band = mongoose.model('bands');

// load location model
require(dirPath + '/api/models/Location');
const Location = mongoose.model('locations');

// load festival model
require(dirPath + '/api/models/Festival');
const Festival = mongoose.model('festivals');

// load dereference.js
const dereference = require(dirPath + '/api/helpers/dereference');

function generateUrl(object, model, urlList) {
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

function checkUrl(object, model, url, urlList, counter) {
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

			const savedObject = await collection[model].findOne({ url: new RegExp('^' + url + '$', 'i') });
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

function generateEventUrl(object, model, urlList) {
	return new Promise(async (resolve, reject) => {
		const urlListChecked = urlList || [];
		try {
			const copiedObject = JSON.parse(JSON.stringify(object));
			const dereferenced = await dereference.eventObject(object);
			copiedObject.url = generateUrlFromObject(dereferenced, model);
			const response = await checkEventUrl(copiedObject, model, copiedObject.url, urlListChecked, 2);
			resolve(response);
		}
		catch (err) {
			reject(err);
		}
	});
}

function checkEventUrl(object, model, url, urlList, counter) {
	return new Promise(async (resolve, reject) => {
		if (!object) resolve(null);

		try {
			if ((urlList.length > 0) && urlList.includes(url)) {
				url = object.url + '--' + counter;
				counter++;
				const response = await checkEventUrl(object, model, url, urlList, counter);
				resolve(response);
			}

			const savedEvent = await Event.findOne({ url: new RegExp('^' + url + '$', 'i') });
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
				const savedArchivedEvent = await ArchivedEvent.findOne({ url: new RegExp('^' + url + '$', 'i') });
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

function generateUrlFromObject(object, type) {
	let url = '';
	
	switch (type) {
		case 'location':
			url = deUmlaut(object.name) + '--' + deUmlaut(object.address.default.city);
			break;
		case 'event':
		case 'archive':
		case 'unvalidated':
			url = deUmlaut(object.name) + '--' + moment(object.date).format('DD-MM-YYYY') + '--' + deUmlaut(object.location.name);
			break;
		default:
			url = deUmlaut(object.name);
	}
	return url.toLocaleLowerCase();
}

function deUmlaut(value) {
	value = value.replace(/ä/g, 'ae');
	value = value.replace(/ö/g, 'oe');
	value = value.replace(/ü/g, 'ue');
	value = value.replace(/Ä/g, 'Ae');
	value = value.replace(/Ö/g, 'Oe');
	value = value.replace(/Ü/g, 'Ue');
	value = value.replace(/ß/g, 'ss');
	value = value.replace(/ /g, '-');
	value = value.replace(/\./g, '');
	value = value.replace(/,/g, '');
	value = value.replace(/\(/g, '');
	value = value.replace(/\)/g, '');
	value = value.replace(/\//g, '-');
	value = value.replace(/-+/g, '-');
	value = value.replace(/-$/g, '');
	value = value.replace(/^-/g, '');
	return value;
}

module.exports = {
	generateUrl: generateUrl,
	generateEventUrl: generateEventUrl
};