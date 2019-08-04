const fs = require('fs');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);

const convertFile = path => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await readFileAsync(path);
      await unlinkAsync(path);
      return resolve(JSON.parse(data));
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  convertFile,
};
