/* eslint curly: "error" */
const mongoose = require('mongoose');
const algoliasearch = require('algoliasearch');

const url = require('../helpers/url');
const image = require('../helpers/image');
const algoliaFallback = require('./algoliaFallback.json');
require('../models/Band');
require('../models/Genre');

const places = algoliasearch.initPlaces('plV0531XU62R', '664efea28c2e61a6b5d7640f76856143');

const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Genre = mongoose.model('genres');

// check all attributes and build the finished object
const validateBand = (data, type, options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const optionsChecked = options || {};
      const id = optionsChecked.id || '';
      const urlList = optionsChecked.urlList || [];
      const imagePath = optionsChecked.image || '';

      if (!(typeof data.name === 'string' && data.name.trim().length > 0)) {
        return resolve("Attribute 'name' has to be a string with 1 or more characters.");
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

      if (!(typeof data.origin.city === 'string' && data.origin.city.length > 0)) {
        return resolve("Attribute 'origin.city' has to be a string with 1 or more characters.");
      }

      if (
        !(
          data.origin.administrative === undefined || typeof data.origin.administrative === 'string'
        )
      ) {
        return resolve("Attribute 'origin.administrative' can be left out or has to be a string.");
      }

      if (!(typeof data.origin.country === 'string' && data.origin.country.length > 0)) {
        return resolve("Attribute 'origin.country' has to be a string with 1 or more characters.");
      }

      if (!(data.origin.postcode === undefined || typeof data.origin.postcode === 'string')) {
        return resolve("Attribute 'origin.postcode' can be left out or has to be a string.");
      }

      if (typeof data.origin.lat !== 'number') {
        return resolve("Attribute 'origin.lat' has to be a number.");
      }

      if (typeof data.origin.lng !== 'number') {
        return resolve("Attribute 'origin.lng' has to be a number.");
      }

      if (!(data.origin.value === undefined || typeof data.origin.value === 'string')) {
        return resolve("Attribute 'origin.value' can be left out or has to be a string.");
      }

      if (!(typeof data.origin.countryCode === 'string' && data.origin.countryCode.length > 0)) {
        return resolve(
          "Attribute 'origin.countryCode' has to be a string with 1 or more characters."
        );
      }

      if (!(data.history === undefined || typeof data.history === 'string')) {
        return resolve("Attribute 'history' can be left out or has to be a string.");
      }

      if (!(data.recordLabel === undefined || typeof data.recordLabel === 'string')) {
        return resolve("Attribute 'recordLabel' can be left out or has to be a string.");
      }

      if (!(data.releases === undefined || Array.isArray(data.releases))) {
        return resolve(
          "Attribute 'releases' has to be an array of objects with the attributes 'releaseName' and 'releaseYear'."
        );
      }
      if (
        data.releases !== undefined &&
        data.releases.some(release => {
          if (release.releaseName === undefined || release.releaseYear === undefined) {
            return true;
          }
          return false;
        })
      ) {
        return resolve(
          "Attribute 'releases' has to be an array of objects each with the attributes 'releaseName' and 'releaseYear'."
        );
      }

      if (!(data.foundingDate === undefined || typeof data.foundingDate === 'string')) {
        return resolve("Attribute 'foundingDate' can be left out or has to be a string.");
      }

      if (!(data.website === undefined || typeof data.website === 'string')) {
        return resolve("Attribute 'website' can be left out or has to be a string.");
      }

      if (!(data.bandcampUrl === undefined || typeof data.bandcampUrl === 'string')) {
        return resolve("Attribute 'bandcampUrl' can be left out or has to be a string.");
      }

      if (!(data.soundcloudUrl === undefined || typeof data.soundcloudUrl === 'string')) {
        return resolve("Attribute 'soundcloudUrl' can be left out or has to be a string.");
      }

      if (!(data.facebookUrl === undefined || typeof data.facebookUrl === 'string')) {
        return resolve("Attribute 'facebookUrl' can be left out or has to be a string.");
      }

      let res;
      if (process.env.NODE_ENV === 'local') {
        res = algoliaFallback.city;
      } else {
        res = await places.search({
          query: data.origin.value
            ? data.origin.value
            : `${data.origin.city}, ${data.origin.country}`,
          language: data.countryCode,
          type: 'city',
        });
      }

      const origin = {
        city: [],
        country: [],
      };
      if (res.hits[0] !== undefined) {
        if (res.hits[0].locale_names) {
          Object.keys(res.hits[0].locale_names).forEach(attribute => {
            res.hits[0].locale_names[attribute].forEach(value => {
              if (!origin.city.includes(value)) {
                origin.city.push(value);
              }
            });
          });
        }
        if (res.hits[0].county) {
          Object.keys(res.hits[0].county).forEach(attribute => {
            res.hits[0].county[attribute].forEach(value => {
              if (!origin.city.includes(value)) {
                origin.city.push(value);
              }
            });
          });
        }
        if (res.hits[0].administrative) {
          res.hits[0].administrative.forEach(value => {
            if (!origin.city.includes(value)) {
              origin.city.push(value);
            }
          });
        }

        if (res.hits[0].country) {
          Object.keys(res.hits[0].country).forEach(attribute => {
            if (!origin.country.includes(res.hits[0].country[attribute])) {
              origin.country.push(res.hits[0].country[attribute]);
            }
          });
        }
      }

      let imageList = [];
      if (imagePath.length > 0) {
        imageList = await image.saveImages(imagePath, 'bands');
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
          put: Band,
          validate: UnvalidatedBand,
        };
        const object = await model[type].findById(id);
        if (!object) {
          return resolve('No band found with this ID');
        }

        if (imageList.length > 0) {
          await image.deleteImages(object.image);
        }

        const newBand = {
          name: data.name.trim(),
          url: '',
          genre: finalGenres,
          origin: {
            default: {
              city: data.origin.city,
              administrative:
                data.origin.administrative !== undefined
                  ? data.origin.administrative
                  : object.origin.administrative,
              country: data.origin.country,
              postcode:
                data.origin.postcode !== undefined ? data.origin.postcode : object.origin.postcode,
              lat: data.origin.lat,
              lng: data.origin.lng,
              value: data.origin.value !== undefined ? data.origin.value : object.origin.value,
              countryCode: data.origin.countryCode,
            },
            international: origin,
          },
          history: data.history !== undefined ? data.history : object.history,
          recordLabel: data.recordLabel !== undefined ? data.recordLabel : object.recordLabel,
          releases: data.releases !== undefined ? data.releases : object.releases,
          foundingDate: data.foundingDate !== undefined ? data.foundingDate : object.foundingDate,
          website: data.website !== undefined ? data.website : object.website,
          bandcampUrl: data.bandcampUrl !== undefined ? data.bandcampUrl : object.bandcampUrl,
          soundcloudUrl:
            data.soundcloudUrl !== undefined ? data.soundcloudUrl : object.soundcloudUrl,
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
          newBand._id = id;
        }
        const updatedObject = await url.generateUrl(newBand, 'band');
        return resolve(updatedObject);
      }
      const newBand = {
        name: data.name.trim(),
        url: '',
        genre: finalGenres,
        origin: {
          default: {
            city: data.origin.city,
            administrative:
              data.origin.administrative !== undefined ? data.origin.administrative : '',
            country: data.origin.country,
            postcode: data.origin.postcode !== undefined ? data.origin.postcode : '',
            lat: data.origin.lat,
            lng: data.origin.lng,
            value: data.origin.value !== undefined ? data.origin.value : '',
            countryCode: data.origin.countryCode,
          },
          international: origin,
        },
        history: data.history !== undefined ? data.history : '',
        recordLabel: data.recordLabel !== undefined ? data.recordLabel : '',
        releases: data.releases !== undefined ? data.releases : [],
        foundingDate: data.foundingDate !== undefined ? data.foundingDate : '',
        website: data.website !== undefined ? data.website : '',
        bandcampUrl: data.bandcampUrl !== undefined ? data.bandcampUrl : '',
        soundcloudUrl: data.soundcloudUrl !== undefined ? data.soundcloudUrl : '',
        facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl : '',
        image: imageList,
        imageSource: {
          text:
            data.imageSource && data.imageSource.text !== undefined ? data.imageSource.text : '',
          url: data.imageSource && data.imageSource.url !== undefined ? data.imageSource.url : '',
        },
      };
      if (type === 'unvalidated') {
        return resolve(newBand);
      }
      const updatedObject = await url.generateUrl(newBand, 'band', urlList);
      return resolve(updatedObject);
    } catch (err) {
      return reject(err);
    }
  });
};

// validate all attributes for one band object in the request body
const validateObject = type => {
  return async (req, res, next) => {
    try {
      const options = {};
      if (type === 'put' || type === 'validate') {
        options.id = req.params._id;
      }
      if (req.file !== undefined) {
        options.image = req.file.path;
      }

      const response = await validateBand(JSON.parse(req.body.data), type, options);
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

// validate all attributes for a list of band objects in the request body
const validateList = type => {
  return async (req, res, next) => {
    try {
      const responseList = [];
      const urlList = [];
      const data = JSON.parse(req.body.data);
      for (const current of data.list) {
        const response = await validateBand(current, type, { urlList });
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
  validateList,
};
