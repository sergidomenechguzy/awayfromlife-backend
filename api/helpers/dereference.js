const mongoose = require('mongoose');
const moment = require('moment');

require('../models/Event');
require('../models/Location');
require('../models/Band');
require('../models/Genre');
require('../models/Festival');
require('../models/FestivalEvent');

const Event = mongoose.model('events');
const Location = mongoose.model('locations');
const UnvalidatedLocation = mongoose.model('unvalidated_locations');
const Band = mongoose.model('bands');
const UnvalidatedBand = mongoose.model('unvalidated_bands');
const Genre = mongoose.model('genres');
const Festival = mongoose.model('festivals');
const FestivalEvent = mongoose.model('festival_events');
const UnvalidatedFestivalEvent = mongoose.model('unvalidated_festival_events');

const bandObject = band => {
  return new Promise(async (resolve, reject) => {
    if (typeof band === 'string') {
      return resolve(band);
    }

    try {
      const promises = band.genre.map(async genreID => {
        let result = await Genre.findById(genreID);
        if (!result) {
          result = 'Genre not found';
        }
        return result.name;
      });
      const genreList = await Promise.all(promises);

      genreList.sort((a, b) => {
        return a.localeCompare(b);
      });

      const releaseList = band.releases;
      releaseList.sort((a, b) => {
        return a.releaseYear.localeCompare(b.releaseYear);
      });

      const responseBand = {
        _id: band._id,
        name: band.name,
        url: band.url,
        genre: genreList,
        origin: band.origin.default,
        history: band.history,
        recordLabel: band.recordLabel,
        releases: releaseList,
        foundingDate: band.foundingDate,
        website: band.website,
        bandcampUrl: band.bandcampUrl,
        soundcloudUrl: band.soundcloudUrl,
        facebookUrl: band.facebookUrl,
        image: band.image,
        imageSource: band.imageSource,
        lastModified: band.lastModified,
      };
      return resolve(responseBand);
    } catch (err) {
      return reject(err);
    }
  });
};

const locationObject = location => {
  return new Promise(async (resolve, reject) => {
    if (typeof location === 'string') {
      return resolve(location);
    }

    try {
      const responseLocation = {
        _id: location._id,
        name: location.name,
        url: location.url,
        address: location.address.default,
        status: location.status,
        information: location.information,
        website: location.website,
        facebookUrl: location.facebookUrl,
        image: location.image,
        imageSource: location.imageSource,
        lastModified: location.lastModified,
      };
      return resolve(responseLocation);
    } catch (err) {
      return reject(err);
    }
  });
};

const eventObject = event => {
  return new Promise(async (resolve, reject) => {
    if (typeof event === 'string') {
      return resolve(event);
    }

    try {
      let location;
      if (event.location === 'Location was deleted') {
        location = event.location;
      } else {
        location = await Location.findById(event.location);
        let isValidated = true;
        if (!location) {
          location = 'Location not found';
          if (!event.verifiable) {
            const unvalidatedLocation = await UnvalidatedLocation.findById(event.location);
            if (unvalidatedLocation) {
              location = unvalidatedLocation;
              isValidated = false;
            }
          }
        }
        location = await locationObject(location);
        location.isValidated = isValidated;
      }

      const promises = event.bands.map(async (bandID, index) => {
        let result = await Band.findById(bandID);
        let isValidated = true;
        if (!result) {
          result = 'Band not found';
          if (!event.verifiable) {
            const unvalidatedResult = await UnvalidatedBand.findById(bandID);
            if (unvalidatedResult) {
              result = unvalidatedResult;
              isValidated = false;
            }
          }
        }
        const dereferenced = await bandObject(result);
        dereferenced.isValidated = isValidated;
        return { band: dereferenced, index };
      });
      const bandList = await Promise.all(promises);
      const bandListSorted = [];
      bandList.forEach(band => {
        bandListSorted[band.index] = band.band;
      });

      const responseEvent = {
        _id: event._id,
        name: event.name,
        url: event.url,
        description: event.description,
        location,
        date: moment(event.date).format('YYYY-MM-DD'),
        time: event.time,
        bands: bandListSorted,
        canceled: event.canceled,
        ticketLink: event.ticketLink,
        verifiable: event.verifiable,
        image: event.image,
        imageSource: event.imageSource,
        lastModified: event.lastModified,
      };
      return resolve(responseEvent);
    } catch (err) {
      return reject(err);
    }
  });
};

const festivalEventObject = festivalEvent => {
  return new Promise(async (resolve, reject) => {
    if (typeof festivalEvent === 'string') {
      return resolve(festivalEvent);
    }

    try {
      const promises = festivalEvent.bands.map(async (bandID, index) => {
        let result = await Band.findById(bandID);
        let isValidated = true;
        if (!result) {
          result = 'Band not found';
          if (!festivalEvent.verifiable) {
            const unvalidatedResult = await UnvalidatedBand.findById(bandID);
            if (unvalidatedResult) {
              result = unvalidatedResult;
              isValidated = false;
            }
          }
        }
        const dereferenced = await bandObject(result);
        dereferenced.isValidated = isValidated;
        return { band: dereferenced, index };
      });
      const bandList = await Promise.all(promises);
      const bandListSorted = [];
      bandList.forEach(band => {
        bandListSorted[band.index] = band.band;
      });

      const responseFestivalEvent = {
        _id: festivalEvent._id,
        name: festivalEvent.name,
        description: festivalEvent.description,
        startDate: moment(festivalEvent.startDate).format('YYYY-MM-DD'),
        endDate: moment(festivalEvent.endDate).format('YYYY-MM-DD'),
        bands: bandListSorted,
        canceled: festivalEvent.canceled,
        verifiable: festivalEvent.verifiable,
        image: festivalEvent.image,
        imageSource: festivalEvent.imageSource,
        lastModified: festivalEvent.lastModified,
      };
      return resolve(responseFestivalEvent);
    } catch (err) {
      return reject(err);
    }
  });
};

const festivalObject = festival => {
  return new Promise(async (resolve, reject) => {
    if (typeof festival === 'string') {
      return resolve(festival);
    }

    try {
      const genrePromises = festival.genre.map(async genreID => {
        let result = await Genre.findById(genreID);
        if (!result) {
          result = 'Genre not found';
        }
        return result.name;
      });
      const genreList = await Promise.all(genrePromises);

      genreList.sort((a, b) => {
        return a.localeCompare(b);
      });

      const eventPromises = festival.events.map(async eventID => {
        const result1 = await FestivalEvent.findById(eventID);
        const result2 = await UnvalidatedFestivalEvent.findById(eventID);
        if (!result1) {
          if (!result2) {
            return 'Event not found';
          }
          return undefined;
        }
        return result1;
      });
      const festivalEventList = await Promise.all(eventPromises);
      const dereferenced = await objectArray(
        festivalEventList.filter(event => event !== undefined),
        'festivalEvent',
        'startDate',
        1
      );

      const responseFestival = {
        _id: festival._id,
        name: festival.name,
        url: festival.url,
        description: festival.description,
        genre: genreList,
        events: dereferenced,
        address: festival.address.default,
        ticketLink: festival.ticketLink,
        website: festival.website,
        facebookUrl: festival.facebookUrl,
        image: festival.image,
        imageSource: festival.imageSource,
        lastModified: festival.lastModified,
      };
      return resolve(responseFestival);
    } catch (err) {
      return reject(err);
    }
  });
};

const reportObject = report => {
  return new Promise(async (resolve, reject) => {
    if (typeof report === 'string') {
      return resolve(report);
    }

    const model = {
      band: Band,
      event: Event,
      festival: Festival,
      location: Location,
    };
    const functions = {
      band: bandObject,
      event: eventObject,
      festival: festivalObject,
      location: locationObject,
    };

    try {
      const object = await model[report.category].findById(report.item);
      const dereferenced = await functions[report.category](object);

      const responseReport = {
        _id: report._id,
        category: report.category,
        item: dereferenced,
        description: report.description,
      };
      return resolve(responseReport);
    } catch (err) {
      return reject(err);
    }
  });
};

const unvalidatedFestivalObject = unvalidatedFestival => {
  return new Promise(async (resolve, reject) => {
    if (typeof unvalidatedFestival === 'string') {
      return resolve(unvalidatedFestival);
    }

    try {
      const promises = unvalidatedFestival.genre.map(async genreID => {
        let result = await Genre.findById(genreID);
        if (!result) {
          result = 'Genre not found';
        }
        return result.name;
      });
      const genreList = await Promise.all(promises);

      genreList.sort((a, b) => {
        return a.localeCompare(b);
      });

      const responseFestival = {
        _id: unvalidatedFestival._id,
        name: unvalidatedFestival.name,
        url: unvalidatedFestival.url,
        description: unvalidatedFestival.description,
        genre: genreList,
        events: unvalidatedFestival.events,
        address: unvalidatedFestival.address.default,
        ticketLink: unvalidatedFestival.ticketLink,
        website: unvalidatedFestival.website,
        facebookUrl: unvalidatedFestival.facebookUrl,
        image: unvalidatedFestival.image,
      };
      return resolve(responseFestival);
    } catch (err) {
      return reject(err);
    }
  });
};

const bandSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (typeof a === 'string') {
      return 1;
    }
    if (typeof b === 'string') {
      return -1;
    }
    if (sortBy === 'origin.city') {
      if (order === -1) {
        return b.origin.city.localeCompare(a.origin.city);
      }
      return a.origin.city.localeCompare(b.origin.city);
    }
    if (sortBy === 'genre') {
      if (order === -1) {
        return b.genre
          .reduce((x, y) => (x < y ? x : y))
          .localeCompare(a.genre.reduce((x, y) => (x < y ? x : y)));
      }
      return a.genre
        .reduce((x, y) => (x < y ? x : y))
        .localeCompare(b.genre.reduce((x, y) => (x < y ? x : y)));
    }
    if (sortBy === 'lastModified') {
      if (order === -1) {
        return b[sortBy] - a[sortBy];
      }
      return a[sortBy] - b[sortBy];
    }
    if (order === -1) {
      return b.name.localeCompare(a.name);
    }
    return a.name.localeCompare(b.name);
  });
};

const eventSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (typeof a === 'string') {
      return 1;
    }
    if (typeof b === 'string') {
      return -1;
    }
    if (sortBy === 'location') {
      if (order === -1) {
        return b[sortBy].name.localeCompare(a[sortBy].name);
      }
      return a[sortBy].name.localeCompare(b[sortBy].name);
    }
    if (sortBy === 'date') {
      if (order === -1) {
        return b[sortBy].localeCompare(a[sortBy]);
      }
      return a[sortBy].localeCompare(b[sortBy]);
    }
    if (sortBy === 'lastModified') {
      if (order === -1) {
        return b[sortBy] - a[sortBy];
      }
      return a[sortBy] - b[sortBy];
    }
    if (order === -1) {
      return b.name.localeCompare(a.name);
    }
    return a.name.localeCompare(b.name);
  });
};

const festivalSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (sortBy === 'city' || sortBy === 'country') {
      if (order === -1) {
        return b.address[sortBy].localeCompare(a.address[sortBy]);
      }
      return a.address[sortBy].localeCompare(b.address[sortBy]);
    }
    if (sortBy === 'lastModified') {
      if (order === -1) {
        return b[sortBy] - a[sortBy];
      }
      return a[sortBy] - b[sortBy];
    }
    if (order === -1) {
      return b.name.localeCompare(a.name);
    }
    return a.name.localeCompare(b.name);
  });
};

const festivalEventSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (typeof a === 'string') {
      return 1;
    }
    if (typeof b === 'string') {
      return -1;
    }
    if (sortBy === 'lastModified') {
      if (order === -1) {
        return b[sortBy] - a[sortBy];
      }
      return a[sortBy] - b[sortBy];
    }
    if (order === -1) {
      return b[sortBy].localeCompare(a[sortBy]);
    }
    return a[sortBy].localeCompare(b[sortBy]);
  });
};

const locationSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (sortBy === 'street' || sortBy === 'city') {
      if (order === -1) {
        return b.address[sortBy].localeCompare(a.address[sortBy]);
      }
      return a.address[sortBy].localeCompare(b.address[sortBy]);
    }
    if (sortBy === 'lastModified') {
      if (order === -1) {
        return b[sortBy] - a[sortBy];
      }
      return a[sortBy] - b[sortBy];
    }
    if (order === -1) {
      return b[sortBy].localeCompare(a[sortBy]);
    }
    return a[sortBy].localeCompare(b[sortBy]);
  });
};

const reportSort = (objectList, sortBy, order) => {
  return objectList.sort((a, b) => {
    if (typeof a === 'string') {
      return 1;
    }
    if (typeof b === 'string') {
      return -1;
    }
    if (order === -1) {
      return b.category.localeCompare(a.category);
    }
    return a.category.localeCompare(b.category);
  });
};

const objectArray = (objects, model, sortBy, order) => {
  return new Promise(async (resolve, reject) => {
    if (objects.length === 0) {
      return resolve([]);
    }

    const functions = {
      band: bandObject,
      event: eventObject,
      festivalEvent: festivalEventObject,
      festival: festivalObject,
      location: locationObject,
      report: reportObject,
      unvalidatedFestival: unvalidatedFestivalObject,
    };
    const sort = {
      band: bandSort,
      event: eventSort,
      festivalEvent: festivalEventSort,
      festival: festivalSort,
      location: locationSort,
      report: reportSort,
      unvalidatedFestival: festivalSort,
    };

    try {
      const promises = objects.map(async object => {
        const result = await functions[model](object);
        return result;
      });
      let objectList = await Promise.all(promises);
      if (sortBy !== false) {
        objectList = sort[model](objectList, sortBy, order);
      }

      return resolve(objectList);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  objectArray,
  bandObject,
  eventObject,
  festivalEventObject,
  festivalObject,
  locationObject,
  reportObject,
  unvalidatedFestivalObject,
  bandSort,
  eventSort,
  locationSort,
};
