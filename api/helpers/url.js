const mongoose = require('mongoose');
const moment = require('moment');
const escapeStringRegexp = require('escape-string-regexp');

const dereference = require('../helpers/dereference');
require('../models/Event');
require('../models/Band');
require('../models/Location');
require('../models/Festival');

const Event = mongoose.model('events');
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
      url = `${deUmlaut(object.name)}--${moment(object.date).format('DD-MM-YYYY')}--${deUmlaut(
        object.location.name
      )}`;
      break;
    default:
      url = deUmlaut(object.name);
  }
  return url.toLocaleLowerCase();
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
      event: Event,
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
      if (savedObject === undefined) {
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

const generateUrl = (object, model, urlList) => {
  return new Promise(async (resolve, reject) => {
    const urlListChecked = urlList || [];
    let copiedObject = { ...object };
    copiedObject.url = generateUrlFromObject(object, model);
    try {
      if (model === 'event') {
        copiedObject = await dereference.eventObject(copiedObject);
      }
      const response = await checkUrl(copiedObject, model, copiedObject.url, urlListChecked, 2);
      return resolve(response);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  generateUrl,
};
