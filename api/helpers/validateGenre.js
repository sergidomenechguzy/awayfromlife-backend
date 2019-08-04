const mongoose = require('mongoose');

require('../models/Genre');

const Genre = mongoose.model('genres');

// check all attributes and build the finished object
const validateGenre = (data, type, options) => {
  return new Promise(async (resolve, reject) => {
    const optionsChecked = options || {};
    const id = optionsChecked.id || '';
    const nameList = optionsChecked.nameList || [];

    try {
      if (!(typeof data.name === 'string' && data.name.trim().length > 0)) {
        return resolve("Attribute 'name' has to be a string with 1 or more characters.");
      }

      const genres = await Genre.find();
      const genreNames = genres.map(genre => genre.name.toLowerCase());
      if (type === 'put') {
        const object = await Genre.findById(id);
        if (!object) {
          return resolve('No genre found with this ID');
        }

        const index = genreNames.indexOf(data.name.toLowerCase());
        if (index < 0 || genres[index]._id.toString() === id) {
          const newGenre = {
            _id: id,
            name: data.name.trim(),
          };
          return resolve(newGenre);
        }
        return resolve('A genre with this name already exists.');
      }
      if (genreNames.includes(data.name.toLowerCase())) {
        return resolve(
          type === 'multiple'
            ? 'At least one genre already exists.'
            : 'A genre with this name already exists.'
        );
      }
      if (nameList.includes(data.name.toLowerCase())) {
        return resolve('All the names of the genres have to be different.');
      }

      const newGenre = {
        name: data.name.trim(),
      };
      return resolve(newGenre);
    } catch (err) {
      return reject(err);
    }
  });
};

// validate all attributes for one genre object in the request body
const validateObject = type => {
  return async (req, res, next) => {
    try {
      let response;
      if (type === 'put') {
        response = await validateGenre(req.body, type, { id: req.params._id });
      } else {
        response = await validateGenre(req.body, type);
      }
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

// validate all attributes for a list of genre objects in the request body
const validateList = () => {
  return async (req, res, next) => {
    try {
      const responseList = [];
      const nameList = [];
      for (const current of req.body.list) {
        const response = await validateGenre(current, 'multiple', { nameList });
        if (typeof response === 'string') {
          return res.status(400).json({ message: response, token: res.locals.token });
        }
        responseList.push(response);
        nameList.push(response.name.toLowerCase());
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
