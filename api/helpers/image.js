const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const renameAsync = promisify(fs.rename);

function saveImages(path) {
	return new Promise(async (resolve, reject) => {
		try {
			const imageBuffer = await readFileAsync(path);
			const originalMetadata = await sharp(imageBuffer).metadata();
			let newPath;

			let promises = [crop(imageBuffer, modifyPath(path, 'S'), 70, 70)];
			if (originalMetadata.width > 600) {
				promises.push(scale(imageBuffer, modifyPath(path, 'M'), 600));
				if (originalMetadata.width > 1500)
					promises.push(scale(imageBuffer, modifyPath(path, 'L'), 1500));
				else
					newPath = modifyPath(path, 'L');
			}
			else
				newPath = modifyPath(path, 'M');

			const imageList = await Promise.all(promises);
			if (newPath != undefined) {
				await renameAsync(path, newPath);
				imageList.push(newPath);
			}
			else
				await unlinkAsync(path);
			resolve(imageList);
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
			resolve(outputPath);
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
			resolve(outputPath);
		}
		catch (err) {
			reject(err);
		}
	});
}

function modifyPath(path, letter) {
	let pathArray = path.split('.');
	pathArray[pathArray.length - 2] += `_${letter}`;
	let outputPath = pathArray.join('.');
	return outputPath;
}

module.exports = {
	saveImages: saveImages
};