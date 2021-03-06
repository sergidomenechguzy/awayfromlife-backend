const mongoose = require('mongoose');
const algoliasearch = require('algoliasearch');

const url = require('../helpers/url');
const image = require('../helpers/image');
const algoliaFallback = require('./algoliaFallback.json');
require('../models/Festival');
require('../models/Genre');

const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');

const Festival = mongoose.model('festivals');
const UnvalidatedFestival = mongoose.model('unvalidated_festivals');
const Genre = mongoose.model('genres');

// check all attributes and build the finished object
const validateFestival = (data, type, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const optionsChecked = options || {};
      const id = optionsChecked.id || '';
      const festivalEventId = optionsChecked.festivalEventId || '';
      const urlList = optionsChecked.urlList || [];
      const imagePath = optionsChecked.image || '';

      if (!(typeof data.name === 'string' && data.name.trim().length > 0)) {
        return resolve("Attribute 'name' has to be a string with 1 or more characters.");
      }

      if (!(data.description === undefined || typeof data.description === 'string')) {
        return resolve("Attribute 'description' can be left out or has to be a string.");
      }

      const genreList = [];
      if (!(Array.isArray(data.genre) && data.genre.length > 0 && data.genre.length < 4)) {
        return resolve(
          "Attribute 'genre' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database."
        );
      }
      if (
        data.genre.some(gerne => {
          if (!(typeof gerne === 'string' && gerne.length > 0)) {
            if (!(typeof gerne === 'object' && gerne._id !== undefined)) {
              return true;
            }
            genreList.push(gerne._id);
            return false;
          }
          genreList.push(gerne);
          return false;
        })
      ) {
        return resolve(
          "Attribute 'genre' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database."
        );
      }

      const genres = await Genre.find();
      const finalGenres = [];
      if (
        genreList.some(requestGenre => {
          return !genres.some(savedGenre => {
            if (savedGenre.name === requestGenre || savedGenre._id.toString() === requestGenre) {
              finalGenres.push(savedGenre._id);
              return true;
            }
            return false;
          });
        })
      ) {
        return resolve(
          "Attribute 'genre' has to be an array with 1-3 entries either of names of genres from the database or of genre objects with an _id attribute containing the ID of a genre from the database."
        );
      }

      if (!(typeof data.address.street === 'string' && data.address.street.length > 0)) {
        return resolve("Attribute 'address.street' has to be a string with 1 or more characters.");
      }

      if (
        !(
          data.address.administrative === undefined ||
          typeof data.address.administrative === 'string'
        )
      ) {
        return resolve("Attribute 'address.administrative' can be left out or has to be a string.");
      }

      if (!(typeof data.address.city === 'string' && data.address.city.length > 0)) {
        return resolve("Attribute 'address.city' has to be a string with 1 or more characters.");
      }

      if (!(data.address.county === undefined || typeof data.address.county === 'string')) {
        return resolve("Attribute 'address.county' can be left out or has to be a string.");
      }

      if (!(typeof data.address.country === 'string' && data.address.country.length > 0)) {
        return resolve("Attribute 'address.country' has to be a string with 1 or more characters.");
      }

      if (!(data.address.postcode === undefined || typeof data.address.postcode === 'string')) {
        return resolve("Attribute 'address.postcode' can be left out or has to be a string.");
      }

      if (typeof data.address.lat !== 'number') {
        return resolve("Attribute 'address.lat' has to be a number.");
      }

      if (typeof data.address.lng !== 'number') {
        return resolve("Attribute 'address.lng' has to be a number.");
      }

      if (!(data.address.value === undefined || typeof data.address.value === 'string')) {
        return resolve("Attribute 'address.value' can be left out or has to be a string.");
      }

      if (!(typeof data.address.countryCode === 'string' && data.address.countryCode.length > 0)) {
        return resolve(
          "Attribute 'address.countryCode' has to be a string with 1 or more characters."
        );
      }

      if (!(data.ticketLink === undefined || typeof data.ticketLink === 'string')) {
        return resolve("Attribute 'ticketLink' can be left out or has to be a string.");
      }

      if (!(data.website === undefined || typeof data.website === 'string')) {
        return resolve("Attribute 'website' can be left out or has to be a string.");
      }

      if (!(data.facebookUrl === undefined || typeof data.facebookUrl === 'string')) {
        return resolve("Attribute 'facebookUrl' can be left out or has to be a string.");
      }

      let res;
      if (process.env.NODE_ENV === 'local') {
        res = algoliaFallback.address;
      } else {
        res = await places.search({
          query: data.address.value
            ? data.address.value
            : `${data.address.street}, ${data.address.city}`,
          language: data.countryCode,
          type: 'address',
        });
        if (res.hits[0] === undefined) {
          res = await places.search({
            query: `${data.address.street}, ${data.address.county}`,
            language: data.countryCode,
            type: 'address',
          });
        }
      }

      const address = {
        street: '',
        city: [],
        country: [],
      };
      if (res.hits[0] !== undefined) {
        address.street = res.hits[0].locale_names.default[0];

        if (res.hits[0].city) {
          Object.keys(res.hits[0].city).forEach(attribute => {
            res.hits[0].city[attribute].forEach(value => {
              if (!address.city.includes(value)) {
                address.city.push(value);
              }
            });
          });
        }
        if (res.hits[0].county) {
          Object.keys(res.hits[0].county).forEach(attribute => {
            res.hits[0].county[attribute].forEach(value => {
              if (!address.city.includes(value)) {
                address.city.push(value);
              }
            });
          });
        }
        if (res.hits[0].administrative) {
          res.hits[0].administrative.forEach(value => {
            if (!address.city.includes(value)) {
              address.city.push(value);
            }
          });
        }

        if (res.hits[0].country) {
          Object.keys(res.hits[0].country).forEach(attribute => {
            if (!address.country.includes(res.hits[0].country[attribute])) {
              address.country.push(res.hits[0].country[attribute]);
            }
          });
        }
      }

      let imageList = [];
      if (imagePath.length > 0) {
        if (Array.isArray(imagePath)) {
          imageList = imagePath;
        } else {
          imageList = await image.saveImages(imagePath, 'festivals');
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
          put: Festival,
          validate: UnvalidatedFestival,
        };

        const object = await model[type].findById(id);
        if (!object) {
          return resolve('No festival found with this ID');
        }

        if (type === 'validate' && !object.events.includes(festivalEventId)) {
          return resolve("Festival event ID not found in the festival's festival events list");
        }

        if (imageList.length > 0) {
          await image.deleteImages(object.image);
        }

        const newFestival = {
          name: data.name.trim(),
          url: '',
          description: data.description !== undefined ? data.description : object.description,
          genre: finalGenres,
          events: type === 'put' ? object.events : [],
          address: {
            default: {
              street: data.address.street,
              administrative:
                data.address.administrative !== undefined
                  ? data.address.administrative
                  : object.address.administrative,
              city: data.address.city,
              county:
                data.address.county !== undefined ? data.address.county : object.address.county,
              country: data.address.country,
              postcode:
                data.address.postcode !== undefined
                  ? data.address.postcode
                  : object.address.postcode,
              lat: data.address.lat,
              lng: data.address.lng,
              value: data.address.value !== undefined ? data.address.value : object.address.value,
              countryCode: data.address.countryCode,
            },
            international: address,
          },
          ticketLink: data.ticketLink !== undefined ? data.ticketLink : object.ticketLink,
          website: data.website !== undefined ? data.website : object.website,
          facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl : object.facebookUrl,
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
          newFestival._id = id;
        }

        const updatedObject = await url.generateUrl(newFestival, 'festival');
        return resolve(updatedObject);
      }
      const newFestival = {
        name: data.name.trim(),
        url: '',
        description: data.description !== undefined ? data.description : '',
        genre: finalGenres,
        events: [],
        address: {
          default: {
            street: data.address.street,
            administrative:
              data.address.administrative !== undefined ? data.address.administrative : '',
            city: data.address.city,
            county: data.address.county !== undefined ? data.address.county : '',
            country: data.address.country,
            postcode: data.address.postcode !== undefined ? data.address.postcode : '',
            lat: data.address.lat,
            lng: data.address.lng,
            value: data.address.value !== undefined ? data.address.value : '',
            countryCode: data.address.countryCode,
          },
          international: address,
        },
        ticketLink: data.ticketLink !== undefined ? data.ticketLink : '',
        website: data.website !== undefined ? data.website : '',
        facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl : '',
        image: imageList,
        imageSource: {
          text:
            data.imageSource && data.imageSource.text !== undefined ? data.imageSource.text : '',
          url: data.imageSource && data.imageSource.url !== undefined ? data.imageSource.url : '',
        },
      };
      if (type === 'unvalidated') {
        return resolve(newFestival);
      }
      const updatedObject = await url.generateUrl(newFestival, 'festival', urlList);
      return resolve(updatedObject);
    } catch (err) {
      return reject(err);
    }
  });
};

// validate all attributes for one band object in the request body
const validateObject = () => {
  return async (req, res, next) => {
    try {
      const options = {
        id: req.params._id,
      };
      if (req.file !== undefined) {
        options.image = req.file.path;
      }

      const response = await validateFestival(JSON.parse(req.body.data), 'put', options);
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

module.exports = {
  validateObject,
  validateFestival,
};
