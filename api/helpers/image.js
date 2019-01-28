const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);

// load secrets
const secrets = require(dirPath + '/api/config/secrets');

function randomPlaceholder() {
	const randomNumber = Math.floor(Math.random() * Math.floor(17)) + 1;
	const pathArray = [
		`images/placeholders/${randomNumber}_S.jpg`,
		`images/placeholders/${randomNumber}_M.jpg`,
		`images/placeholders/${randomNumber}_L.jpg`
	];
	return pathArray;
}

function saveImages(path, outputFolder) {
	return new Promise(async (resolve, reject) => {
		try {
			const imageBuffer = await readFileAsync(path);
			const originalMetadata = await sharp(imageBuffer).metadata();
			let newPath;

			let promises = [crop(imageBuffer, modifyPath(path, outputFolder, 'S'), 70, 70)];
			if (originalMetadata.width > 600) {
				promises.push(scale(imageBuffer, modifyPath(path, outputFolder, 'M'), 600));
				if (originalMetadata.width > 1500)
					promises.push(scale(imageBuffer, modifyPath(path, outputFolder, 'L'), 1500));
				else
					newPath = modifyPath(path, outputFolder, 'L');
			}
			else
				newPath = modifyPath(path, outputFolder, 'M');

			let imageList = await Promise.all(promises);
			if (newPath != undefined) {
				await renameAsync(path, newPath);
				imageList.push(newPath);
			}
			else
				await unlinkAsync(path);

			imageList = imageList.map(path => {
				let pathArray = path.split('/');
				if (pathArray.length <= 3)
					return path;
				else 
					return pathArray.slice(4).join('/');
			});
			return resolve(imageList);
		}
		catch (err) {
			reject(err);
		}
	});
}

function deleteImages(array) {
	return new Promise(async (resolve, reject) => {
		try {
			const promises = array.map(async (path) => {
				if (path.includes('images/placeholders/'))
					return;
				const result = await unlinkAsync(`${secrets.imagePath}${path}`);
				return result;
			});
			await Promise.all(promises);
			return resolve();
		}
		catch (err) {
			reject(err);
		}
	});
}

function scale(imageBuffer, outputPath, size) {
	return new Promise(async (resolve, reject) => {
		try {
			await sharp(imageBuffer)
				.resize(size)
				.toFile(outputPath);
			return resolve(outputPath);
		}
		catch (err) {
			reject(err);
		}
	});
}

function crop(imageBuffer, outputPath, size, crop) {
	return new Promise(async (resolve, reject) => {
		try {
			await sharp(imageBuffer)
				.resize(size, crop)
				.toFile(outputPath);
			return resolve(outputPath);
		}
		catch (err) {
			reject(err);
		}
	});
}

function modifyPath(path, outputFolder, letter) {
	let pathArray = path.split('.');
	pathArray[pathArray.length - 2] += `_${letter}`;
	let outputPath = pathArray.join('.');

	outputPath = outputPath.replace(/\\/g, '/');

	pathArray = outputPath.split('/');
	pathArray[pathArray.length - 2] = outputFolder;
	outputPath = pathArray.join('/');
	return outputPath;
}

module.exports = {
	randomPlaceholder: randomPlaceholder,
	saveImages: saveImages,
	deleteImages: deleteImages
};