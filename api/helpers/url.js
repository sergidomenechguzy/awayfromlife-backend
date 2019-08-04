const mongoose = require('mongoose');
const moment = require('moment');
const escapeStringRegexp = require('escape-string-regexp');

const dereference = require('../helpers/dereference');
require('../models/Event');
require('../models/Band');
require('../models/Location');
require('../models/Festival');

const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const Band = mongoose.model('bands');
const Location = mongoose.model('locations');
const Festival = mongoose.model('festivals');

const deUmlaut = value => {
  let sanitized = value;
  sanitized = sanitized.replace(/ä/g, 'ae');
  sanitized = sanitized.replace(/ö/g, 'oe');
  sanitized = sanitized.replace(/ü/g, 'ue');
  sanitized = sanitized.replace(/Ä/g, 'Ae');
  sanitized = sanitized.replace(/Ö/g, 'Oe');
  sanitized = sanitized.replace(/Ü/g, 'Ue');
  sanitized = sanitized.replace(/ß/g, 'ss');
  sanitized = sanitized.replace(/ /g, '-');
  sanitized = sanitized.replace(/\./g, '');
  sanitized = sanitized.replace(/,/g, '');
  sanitized = sanitized.replace(/\(/g, '');
  sanitized = sanitized.replace(/\)/g, '');
  sanitized = sanitized.replace(/\//g, '-');
  sanitized = sanitized.replace(/\\/g, '-');
  sanitized = sanitized.replace(/-+/g, '-');
  sanitized = sanitized.replace(/-$/g, '');
  sanitized = sanitized.replace(/^-/g, '');
  sanitized = encodeURIComponent(sanitized);
  return sanitized;
};

const generateUrlFromObject = (object, type) => {
  let url = '';

  switch (type) {
    case 'location':
      url = `${deUmlaut(object.name)}--${deUmlaut(object.address.default.city)}`;
      break;
    case 'event':
    case 'archive':
    case 'unvalidated':
      url = `${deUmlaut(object.name)}--${moment(object.date).format('DD-MM-YYYY')}--${deUmlaut(
        object.location.name
      )}`;
      break;
    default:
      url = deUmlaut(object.name);
  }
  return url.toLocaleLowerCase();
};

const checkEventUrl = (inputObject, model, inputUrl, urlList, inputCounter) => {
  return new Promise(async (resolve, reject) => {
    const object = { ...inputObject };
    let url = inputUrl;
    let counter = inputCounter;

    if (!object) {
      return resolve(null);
    }

    try {
      if (urlList.length > 0 && urlList.includes(url)) {
        url = `${object.url}--${counter}`;
        counter++;
        const response = await checkEventUrl(object, model, url, urlList, counter);
        return resolve(response);
      }

      const savedEvent = await Event.findOne({
        url: new RegExp(`^${escapeStringRegexp(url.trim())}$`, 'i'),
      });
      if (savedEvent !== undefined) {
        if (
          object._id &&
          model === 'event' &&
          object._id.toString() === savedEvent._id.toString()
        ) {
          object.url = url;
          return resolve(object);
        }
        url = `${object.url}--${counter}`;
        counter++;
        const response = await checkEventUrl(object, model, url, urlList, counter);
        return resolve(response);
      }
      const savedArchivedEvent = await ArchivedEvent.findOne({
        url: new RegExp(`^${escapeStringRegexp(url.trim())}$`, 'i'),
      });
      if (savedArchivedEvent !== undefined) {
        if (
          object._id &&
          model === 'archive' &&
          object._id.toString() === savedArchivedEvent._id.toString()
        ) {
          object.url = url;
          return resolve(object);
        }
        url = `${object.url}--${counter}`;
        counter++;
        const response = await checkEventUrl(object, model, url, urlList, counter);
        return resolve(response);
      }
      object.url = url;
      return resolve(object);
    } catch (err) {
      return reject(err);
    }
  });
};

const checkUrl = (inputObject, model, inputUrl, urlList, inputCounter) => {
  return new Promise(async (resolve, reject) => {
    const object = { ...inputObject };
    let url = inputUrl;
    let counter = inputCounter;

    if (!object) {
      return resolve(null);
    }

    const collection = {
      band: Band,
      location: Location,
      festival: Festival,
    };

    try {
      if (urlList.length > 0 && urlList.includes(url)) {
        url = `${object.url}--${counter}`;
        counter++;
        const response = await checkUrl(object, model, url, urlList, counter);
        return resolve(response);
      }

      const savedObject = await collection[model].findOne({
        url: new RegExp(`^${escapeStringRegexp(url.trim())}$`, 'i'),
      });
      if (!savedObject) {
        object.url = url;
        return resolve(object);
      }
      if (object._id && object._id.toString() === savedObject._id.toString()) {
        object.url = url;
        return resolve(object);
      }
      url = `${object.url}--${counter}`;
      counter++;
      const response = await checkUrl(object, model, url, urlList, counter);
      return resolve(response);
    } catch (err) {
      return reject(err);
    }
  });
};

const generateEventUrl = (object, model, urlList) => {
  return new Promise(async (resolve, reject) => {
    const urlListChecked = urlList || [];
    try {
      const copiedObject = JSON.parse(JSON.stringify(object));
      const dereferenced = await dereference.eventObject(object);
      copiedObject.url = generateUrlFromObject(dereferenced, model);
      const response = await checkEventUrl(
        copiedObject,
        model,
        copiedObject.url,
        urlListChecked,
        2
      );
      return resolve(response);
    } catch (err) {
      return reject(err);
    }
  });
};

const generateUrl = (object, model, urlList) => {
  return new Promise(async (resolve, reject) => {
    const urlListChecked = urlList || [];
    const copiedObject = JSON.parse(JSON.stringify(object));
    copiedObject.url = generateUrlFromObject(object, model);
    try {
      const response = await checkUrl(copiedObject, model, copiedObject.url, urlListChecked, 2);
      return resolve(response);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  generateUrl,
  generateEventUrl,
};
