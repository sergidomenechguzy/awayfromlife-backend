const fs = require('fs');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

function convertFile(path) {
	return new Promise(async (resolve, reject) => {
		try {
			fs.readFile(path, async (err, data) => {
				if (err) {
					console.log(err);
					return res.status(500).json({ message: 'Error, something went wrong. Please try again.', error: err.name + ': ' + err.message });
				}
				await unlinkAsync(path);
				resolve(JSON.parse(data));
				
			});
		}
		catch (err) {
			reject(err);
		}
	});
}

module.exports = {
	convertFile: convertFile
};