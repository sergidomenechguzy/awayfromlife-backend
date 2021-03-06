const express = require('express');
const mongoose = require('mongoose');
const escapeStringRegexp = require('escape-string-regexp');

const token = require('../helpers/token');
const dereference = require('../helpers/dereference');
require('../models/Event');
require('../models/Festival');
require('../models/Location');
require('../models/Band');

const router = express.Router();

const Event = mongoose.model('events');
const ArchivedEvent = mongoose.model('archived_events');
const Festival = mongoose.model('festivals');
const Location = mongoose.model('locations');
const Band = mongoose.model('bands');

const createQueries = queries => {
  const eventQuery = {
    attributes: [],
    values: [],
    genres: [],
  };
  const festivalQuery = {
    query: {},
    genres: [],
  };
  let locationQuery = {};
  const bandQuery = {
    query: {},
    genres: [],
  };

  if (queries.city !== undefined) {
    eventQuery.attributes.push('location.address.city');
    eventQuery.values.push(new RegExp(escapeStringRegexp(queries.city.trim()), 'i'));
    eventQuery.attributes.push('location.address.county');
    eventQuery.values.push(new RegExp(escapeStringRegexp(queries.city.trim()), 'i'));

    const cityQuery = {
      $or: [
        { 'address.default.city': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
        {
          'address.default.administrative': new RegExp(
            escapeStringRegexp(queries.city.trim()),
            'i'
          ),
        },
        { 'address.default.county': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
        { 'address.international.city': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
      ],
    };

    festivalQuery.query = cityQuery;
    locationQuery = cityQuery;

    bandQuery.query = {
      $or: [
        { 'origin.default.city': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
        {
          'origin.default.administrative': new RegExp(escapeStringRegexp(queries.city.trim()), 'i'),
        },
        { 'origin.default.county': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
        { 'origin.international.city': new RegExp(escapeStringRegexp(queries.city.trim()), 'i') },
      ],
    };
  } else if (queries.country !== undefined) {
    eventQuery.attributes.push('location.address.country');
    eventQuery.values.push(new RegExp(escapeStringRegexp(queries.country.trim()), 'i'));

    const countryQuery = {
      $or: [
        { 'address.default.country': RegExp(escapeStringRegexp(queries.country.trim()), 'i') },
        {
          'address.international.country': new RegExp(
            escapeStringRegexp(queries.country.trim()),
            'i'
          ),
        },
      ],
    };

    festivalQuery.query = countryQuery;
    locationQuery = countryQuery;

    bandQuery.query = {
      $or: [
        { 'origin.default.country': RegExp(escapeStringRegexp(queries.country.trim()), 'i') },
        {
          'origin.international.country': new RegExp(
            escapeStringRegexp(queries.country.trim()),
            'i'
          ),
        },
      ],
    };
  }

  if (queries.genre !== undefined) {
    const genres = queries.genre.split(',');
    genres.forEach(genre => {
      const genreRegex = new RegExp(`${escapeStringRegexp(genre.trim())}$`, 'i');
      eventQuery.genres.push(genreRegex);
      festivalQuery.genres.push(genreRegex);
      bandQuery.genres.push(genreRegex);
    });
  }

  return {
    events: eventQuery,
    festivals: festivalQuery,
    locations: locationQuery,
    bands: bandQuery,
  };
};

const buildObject = (object, category, attribute, value) => {
  return {
    category,
    data: object,
    match: {
      attribute: `${category.toLowerCase()}.${attribute[0]}`,
      pretty: attribute[1],
      value,
    },
  };
};

const eventFind = (queries, regex) => {
  return new Promise(async (resolve, reject) => {
    try {
      const eventSearchAttributes = [
        ['name', 'name'],
        ['date', 'date'],
        ['location.name', 'location name'],
        ['location.address.street', 'location address'],
        ['location.address.city', 'location city'],
        ['location.address.county', 'location county'],
        ['location.address.administrative', 'location administrative'],
        ['bands', 'bands'],
      ];
      const eventResults = [];

      let events = await Event.find();
      const archivedEvents = await ArchivedEvent.find();
      events = [...events, ...archivedEvents];
      const dereferenced = await dereference.objectArray(events, 'event', 'name', 1);

      dereferenced.forEach(event => {
        if (
          (queries.attributes.length === 0 ||
            queries.attributes.some((attribute, index) => {
              const value = attribute.split('.').reduce((prev, curr) => {
                return prev[curr];
              }, event);
              return queries.values[index].test(value);
            })) &&
          (queries.genres.length === 0 ||
            event.bands.some(band => {
              return queries.genres.some(currentGenre => {
                return band.genre.some(genre => {
                  return currentGenre.test(genre);
                });
              });
            }))
        ) {
          eventSearchAttributes.some(attribute => {
            let value = attribute[0].split('.').reduce((prev, curr) => {
              return prev[curr];
            }, event);

            if (attribute[0] === 'bands') {
              return value.some(band => {
                if (regex.test(band.name)) {
                  const bandString = [band.name];
                  event.bands.some(currentBand => {
                    if (bandString.length === 3) {
                      bandString.push('...');
                      return true;
                    }
                    if (currentBand.name !== band.name) {
                      bandString.push(currentBand.name);
                    }
                    return false;
                  });
                  value = bandString.join(', ');
                  eventResults.push(buildObject(event, 'Event', attribute, value));
                  return true;
                }
                return false;
              });
            }
            if (regex.test(value)) {
              eventResults.push(buildObject(event, 'Event', attribute, value));
              return true;
            }
            return false;
          });
        }
      });
      return resolve(eventResults);
    } catch (err) {
      return reject(err);
    }
  });
};

const festivalFind = (queries, regex) => {
  return new Promise(async (resolve, reject) => {
    try {
      const festivalSearchAttributes = [
        ['name', 'name'],
        ['address.default.street', 'address'],
        ['address.default.city', 'city'],
        ['address.default.county', 'county'],
        ['address.default.administrative', 'administrative'],
        ['address.default.country', 'country'],
        ['address.international.street', 'address'],
        ['address.international.city', 'city'],
        ['address.international.country', 'country'],
      ];

      const dateAttribute = ['events.date', 'date'];
      const bandAttribute = ['events.bands', 'bands'];

      const festivals = await Festival.find(queries.query);

      const promises = festivals.map(async festival => {
        const dereferenced = await dereference.festivalObject(festival);
        if (
          queries.genres.length === 0 ||
          queries.genres.some(currentGenre => {
            return dereferenced.genre.some(genre => {
              return currentGenre.test(genre);
            });
          })
        ) {
          let matchedAttribute;
          let matchedValue;

          if (
            festivalSearchAttributes.some(attribute => {
              const value = attribute[0].split('.').reduce((prev, curr) => {
                return prev[curr];
              }, festival);

              if (Array.isArray(value)) {
                return value.some(valueString => {
                  if (regex.test(valueString)) {
                    matchedAttribute = attribute;
                    matchedValue = valueString;
                    return true;
                  }
                  return false;
                });
              }
              if (regex.test(value)) {
                matchedAttribute = attribute;
                matchedValue = value;
                return true;
              }
              return false;
            }) ||
            dereferenced.events.some(festivalEvent => {
              const date = regex.toString().slice(1, regex.toString().length - 2);
              if (
                festivalEvent.startDate.localeCompare(date) === -1 &&
                festivalEvent.endDate.localeCompare(date) === 1
              ) {
                matchedAttribute = [
                  dateAttribute[0],
                  `'${festivalEvent.name}', ${dateAttribute[1]}`,
                ];
                matchedValue = `${festivalEvent.startDate} - ${festivalEvent.endDate}`;
                return true;
              }
              return festivalEvent.bands.some(band => {
                if (regex.test(band.name)) {
                  matchedAttribute = [
                    bandAttribute[0],
                    `'${festivalEvent.name}', ${bandAttribute[1]}`,
                  ];
                  matchedValue = [band.name];
                  festivalEvent.bands.some(currentBand => {
                    if (matchedValue.length === 3) {
                      matchedValue.push('...');
                      return true;
                    }
                    if (currentBand.name !== band.name) {
                      matchedValue.push(currentBand.name);
                    }
                    return false;
                  });
                  matchedValue = matchedValue.join(', ');
                  return true;
                }
                return false;
              });
            })
          ) {
            return buildObject(dereferenced, 'Festival', matchedAttribute, matchedValue);
          }
        }
        return null;
      });
      let festivalResults = await Promise.all(promises);
      festivalResults = festivalResults.filter(festivalObject => festivalObject !== null);

      return resolve(festivalResults);
    } catch (err) {
      return reject(err);
    }
  });
};

const locationFind = (queries, regex) => {
  return new Promise(async (resolve, reject) => {
    try {
      const locationSearchAttributes = [
        ['name', 'name'],
        ['address.default.street', 'address'],
        ['address.default.city', 'city'],
        ['address.default.county', 'county'],
        ['address.default.administrative', 'administrative'],
        ['address.default.country', 'country'],
        ['address.international.street', 'address'],
        ['address.international.city', 'city'],
        ['address.international.country', 'country'],
      ];

      const locations = await Location.find(queries);

      const promises = locations.map(async location => {
        let matchedAttribute;
        let matchedValue;
        if (
          locationSearchAttributes.some(attribute => {
            const value = attribute[0].split('.').reduce((prev, curr) => {
              return prev[curr];
            }, location);

            if (Array.isArray(value)) {
              return value.some(valueString => {
                if (regex.test(valueString)) {
                  matchedAttribute = attribute;
                  matchedValue = valueString;
                  return true;
                }
                return false;
              });
            }
            if (regex.test(value)) {
              matchedAttribute = attribute;
              matchedValue = value;
              return true;
            }
            return false;
          })
        ) {
          const dereferenced = await dereference.locationObject(location);
          return buildObject(dereferenced, 'Location', matchedAttribute, matchedValue);
        }
        return null;
      });
      let locationResults = await Promise.all(promises);
      locationResults = locationResults.filter(locationObject => locationObject !== null);

      return resolve(locationResults);
    } catch (err) {
      return reject(err);
    }
  });
};

const bandFind = (queries, regex) => {
  return new Promise(async (resolve, reject) => {
    try {
      const bandSearchAttributes = [
        ['name', 'name'],
        ['origin.default.city', 'city'],
        ['origin.default.administrative', 'administrative'],
        ['origin.default.country', 'country'],
        ['origin.international.city', 'city'],
        ['origin.international.country', 'country'],
        ['recordLabel', 'label'],
      ];

      const genreAttribute = ['genre', 'genre'];
      const releasesAttribute = ['releases', 'releases'];

      const bands = await Band.find(queries.query);

      const promises = bands.map(async band => {
        const dereferenced = await dereference.bandObject(band);
        if (
          queries.genres.length === 0 ||
          queries.genres.some(currentGenre => {
            return dereferenced.genre.some(genre => {
              return currentGenre.test(genre);
            });
          })
        ) {
          let matchedAttribute;
          let matchedValue;

          if (
            bandSearchAttributes.some(attribute => {
              const value = attribute[0].split('.').reduce((prev, curr) => {
                return prev[curr];
              }, band);

              if (Array.isArray(value)) {
                return value.some(valueString => {
                  if (regex.test(valueString)) {
                    matchedAttribute = attribute;
                    matchedValue = valueString;
                    return true;
                  }
                  return false;
                });
              }
              if (regex.test(value)) {
                matchedAttribute = attribute;
                matchedValue = value;
                return true;
              }
              return false;
            }) ||
            dereferenced.releases.some(release => {
              if (regex.test(release.releaseName)) {
                matchedValue = [release.releaseName];
                dereferenced.releases.some(currentRelease => {
                  if (matchedValue.length === 3) {
                    matchedValue.push('...');
                    return true;
                  }
                  if (currentRelease.releaseName !== release.releaseName) {
                    matchedValue.push(currentRelease.releaseName);
                  }
                  return false;
                });
                matchedValue = matchedValue.join(', ');
                matchedAttribute = releasesAttribute;
                return true;
              }
              return false;
            }) ||
            dereferenced.genre.some(genre => {
              if (regex.test(genre)) {
                matchedValue = dereferenced.genre.join(', ');
                matchedAttribute = genreAttribute;
                return true;
              }
              return false;
            })
          ) {
            return buildObject(dereferenced, 'Band', matchedAttribute, matchedValue);
          }
        }
        return null;
      });
      let bandResults = await Promise.all(promises);
      bandResults = bandResults.filter(bandObject => bandObject !== null);

      return resolve(bandResults);
    } catch (err) {
      return reject(err);
    }
  });
};

// search route
// get all search results with different possible parameters
router.get('/:query', token.checkToken(false), async (req, res) => {
  try {
    let categories = ['events', 'festivals', 'locations', 'bands'];
    if (req.query.categories !== undefined) {
      const queryCategories = req.query.categories.split(',');
      const finalCategories = [];
      queryCategories.forEach(category => {
        if (
          (category === 'events' ||
            category === 'festivals' ||
            category === 'locations' ||
            category === 'bands') &&
          !finalCategories.includes(category)
        ) {
          finalCategories.push(category);
        }
      });
      if (finalCategories.length > 0) {
        categories = finalCategories;
      }
    }
    if (req.query.genre !== undefined && categories.includes('locations')) {
      categories.splice(categories.indexOf('locations'), 1);
    }

    const categoryFunction = {
      events: eventFind,
      festivals: festivalFind,
      bands: bandFind,
      locations: locationFind,
    };

    const results = {
      events: [],
      festivals: [],
      locations: [],
      bands: [],
    };

    const queries = createQueries(req.query);
    const promises = categories.map(async category => {
      const result = await categoryFunction[category](
        queries[category],
        new RegExp(escapeStringRegexp(req.params.query.trim()), 'i')
      );
      results[category] = result;
      return result;
    });
    await Promise.all(promises);
    return res.status(200).json({ data: results, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

// get a maximum of 8 search results without parameters
router.get('/simple/:query', token.checkToken(false), async (req, res) => {
  try {
    const categories = ['events', 'festivals', 'locations', 'bands'];
    const categoryFunction = {
      events: eventFind,
      festivals: festivalFind,
      bands: bandFind,
      locations: locationFind,
    };
    const maxObjects = 8;

    const queries = createQueries({});
    const promises = categories.map(async category => {
      const result = await categoryFunction[category](
        queries[category],
        new RegExp(escapeStringRegexp(req.params.query.trim()), 'i')
      );
      return result;
    });
    const resultLists = await Promise.all(promises);

    const results = [];
    let counter = 0;

    while (results.length < maxObjects) {
      const previousLength = results.length;
      resultLists.forEach(list => {
        if (list.length > counter && results.length < maxObjects) {
          results.push(list[counter]);
        }
      });
      if (previousLength === results.length) {
        break;
      }
      counter++;
    }
    results.sort((a, b) => a.category.localeCompare(b.category));
    return res.status(200).json({ data: results, token: res.locals.token });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Error, something went wrong. Please try again.',
      error: `${err.name}: ${err.message}`,
    });
  }
});

module.exports = router;
