const mongoose = require('mongoose');
const moment = require('moment');

const url = require('../helpers/url');
const image = require('../helpers/image');
const convertJson = require('../helpers/convertJson');
require('../models/Event');
require('../models/Band');
require('../models/Location');

const Event = mongoose.model('events');
const UnvalidatedEvent = mongoose.model('unvalidated_events');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');

// check all attributes and build the finished object
const validateEvent = (data, type, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const optionsChecked = options || {};
      const id = optionsChecked.id || '';
      const urlList = optionsChecked.urlList || [];
      const imagePath = optionsChecked.image || '';
      let verifiable = true;

      if (!(typeof data.name === 'string' && data.name.trim().length > 0)) {
        return resolve("Attribute 'name' has to be a string with 1 or more characters.");
      }

      if (!(data.description === undefined || typeof data.description === 'string')) {
        return resolve("Attribute 'description' can be left out or has to be a string.");
      }

      let locationId;
      if (!(typeof data.location === 'string' && data.location.length > 0)) {
        if (!(typeof data.location === 'object' && data.location._id !== undefined)) {
          return resolve(
            "Attribute 'location' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database."
          );
        }
        locationId = data.location._id;
      } else {
        locationId = data.location;
      }
      const locations = await Location.find();
      const locationIds = locations.map(location => location._id.toString());
      if (!locationIds.includes(locationId)) {
        if (type === 'unvalidated' || type === 'validate') {
          const unvalidatedLocations = await UnvalidatedLocation.find();
          const unvalidatedLocationIds = unvalidatedLocations.map(location =>
            location._id.toString()
          );
          if (!unvalidatedLocationIds.includes(locationId)) {
            return resolve(
              "Attribute 'location' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database."
            );
          }
          if (type === 'validate') {
            return resolve({ verifiable: false });
          }
          verifiable = false;
        } else {
          return resolve(
            "Attribute 'location' has to be either the ID of a location from the database or a location object with an _id attribute containing the ID of a location from the database."
          );
        }
      }

      if (
        !(
          typeof data.date === 'string' &&
          data.date.length > 0 &&
          moment(data.date, 'YYYY-MM-DD', true).isValid()
        )
      ) {
        return resolve("Attribute 'date' has to be a string in the 'YYYY-MM-DD' date format.");
      }
      const finalDate = new Date(data.date);

      if (!(data.time === undefined || typeof data.time === 'string')) {
        return resolve("Attribute 'time' can be left out or has to be a string.");
      }

      const bandList = [];
      if (!(Array.isArray(data.bands) && data.bands.length > 0)) {
        return resolve(
          "Attribute 'bands' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty."
        );
      }
      if (
        data.bands.some(band => {
          if (!(typeof band === 'string' && band.length > 0)) {
            if (!(typeof band === 'object' && band._id !== undefined)) {
              return true;
            }
            bandList.push(band._id);
            return false;
          }
          bandList.push(band);
          return false;
        })
      ) {
        return resolve(
          "Attribute 'bands' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty."
        );
      }

      const bands = await Band.find();
      const bandIds = bands.map(band => band._id.toString());
      const unvalidatedBands = await UnvalidatedBand.find();
      const unvalidatedBandIds = unvalidatedBands.map(band => band._id.toString());
      let unvalidCount = 0;
      if (
        bandList.some(band => {
          if (!bandIds.includes(band)) {
            if (unvalidatedBandIds.includes(band)) {
              verifiable = false;
              unvalidCount++;
              return false;
            }
            return true;
          }
          return false;
        })
      ) {
        return resolve(
          "Attribute 'bands' has to be either an array of IDs of bands from the database or an array of band objects with an _id attribute containing the ID of a band from the database and must not be empty."
        );
      }
      if ((type === 'put' || type === 'post') && unvalidCount === bandList.length) {
        return resolve(
          "Attribute 'bands' has to include at least one validated band from the database."
        );
      }

      if (
        !(
          data.canceled === undefined ||
          (typeof data.canceled === 'number' && data.canceled >= 0 && data.canceled <= 2)
        )
      ) {
        return resolve(
          "Attribute 'canceled' can be left out or has to be either '0', '1' or '2' as a number."
        );
      }

      if (!(data.ticketLink === undefined || typeof data.ticketLink === 'string')) {
        return resolve("Attribute 'ticketLink' can be left out or has to be a string.");
      }

      let imageList = [];
      if (imagePath.length > 0) {
        if (Array.isArray(imagePath)) {
          imageList = imagePath;
        } else {
          imageList = await image.saveImages(imagePath, 'events');
        }
      } else if (
        type === 'post' ||
        type === 'unvalidated' ||
        !data.image ||
        data.image.length === 0
      ) {
        imageList = image.randomPlaceholder();
      }

      if (
        data.imageSource &&
        !(data.imageSource.text === undefined || typeof data.imageSource.text === 'string')
      ) {
        return resolve("Attribute 'imageSource.text' can be left out or has to be a string.");
      }

      if (
        data.imageSource &&
        !(data.imageSource.url === undefined || typeof data.imageSource.url === 'string')
      ) {
        return resolve("Attribute 'imageSource.url' can be left out or has to be a string.");
      }

      if (type === 'put' || type === 'validate') {
        const model = {
          put: Event,
          validate: UnvalidatedEvent,
        };
        const object = await model[type].findById(id);
        if (!object) {
          return resolve('No event found with this ID');
        }

        if (imageList.length > 0) {
          await image.deleteImages(object.image);
        }

        const newEvent = {
          name: data.name,
          url: '',
          description: data.description !== undefined ? data.description : object.description,
          location: locationId,
          date: finalDate,
          time: data.time !== undefined ? data.time : object.time,
          bands: bandList,
          canceled: data.canceled !== undefined ? data.canceled : object.canceled,
          ticketLink: data.ticketLink !== undefined ? data.ticketLink : object.ticketLink,
          verifiable,
          image: imageList.length > 0 ? imageList : object.image,
          imageSource: {
            text:
              data.imageSource && data.imageSource.text !== undefined
                ? data.imageSource.text
                : object.imageSource.text,
            url:
              data.imageSource && data.imageSource.url !== undefined
                ? data.imageSource.url
                : object.imageSource.url,
          },
          lastModified: Date.now(),
        };
        if (type === 'put') {
          newEvent._id = id;
        }
        const updatedObject = await url.generateUrl(newEvent, 'event');
        return resolve(updatedObject);
      }
      const newEvent = {
        name: data.name,
        url: '',
        description: data.description !== undefined ? data.description : '',
        location: locationId,
        date: finalDate,
        time: data.time !== undefined ? data.time : '',
        bands: bandList,
        canceled: data.canceled !== undefined ? data.canceled : 0,
        ticketLink: data.ticketLink !== undefined ? data.ticketLink : '',
        verifiable,
        image: imageList,
        imageSource: {
          text:
            data.imageSource && data.imageSource.text !== undefined ? data.imageSource.text : '',
          url: data.imageSource && data.imageSource.url !== undefined ? data.imageSource.url : '',
        },
      };
      if (type === 'unvalidated') {
        return resolve(newEvent);
      }
      const updatedObject = await url.generateUrl(newEvent, 'event', urlList);
      return resolve(updatedObject);
    } catch (err) {
      return reject(err);
    }
  });
};

// validate all attributes for one event object in the request body
const validateObject = (type, model) => {
  return async (req, res, next) => {
    try {
      const options = {};
      if (type === 'put' || type === 'validate') {
        options.id = req.params._id;
      }
      if (req.file !== undefined) {
        options.image = req.file.path;
      }

      const response = await validateEvent(JSON.parse(req.body.data), type, model, options);
      if (typeof response === 'string') {
        return res.status(400).json({ message: response, token: res.locals.token });
      }
      res.locals.validated = response;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  };
};

// validate all attributes for a list of event objects in the request body
const validateFromJson = (type, model) => {
  return async (req, res, next) => {
    try {
      const options = {};

      const responseList = [];
      const urlList = [];
      const data = await convertJson.convertFile(req.file.path);
      for (const current of data.list) {
        options.urlList = urlList;
        const response = await validateEvent(current, type, model, options);
        if (typeof response === 'string') {
          return res.status(400).json({ message: response, token: res.locals.token });
        }
        responseList.push(response);
        urlList.push(response.url);
      }
      res.locals.validated = responseList;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  };
};

// validate all attributes for a list of event objects in the request body
const validateList = (type, model) => {
  return async (req, res, next) => {
    try {
      const options = {};
      if (req.file !== undefined) {
        options.image = await image.saveImages(req.file.path, 'events');
      }

      const responseList = [];
      const urlList = [];
      const data = JSON.parse(req.body.data);
      for (const current of data.list) {
        options.urlList = urlList;
        const response = await validateEvent(current, type, model, options);
        if (typeof response === 'string') {
          return res.status(400).json({ message: response, token: res.locals.token });
        }
        responseList.push(response);
        urlList.push(response.url);
      }
      res.locals.validated = responseList;
      return next();
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: 'Error, something went wrong. Please try again.',
        error: `${err.name}: ${err.message}`,
      });
    }
  };
};

module.exports = {
  validateObject,
  validateFromJson,
  validateList,
};
