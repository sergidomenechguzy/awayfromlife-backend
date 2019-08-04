const multer = require('multer');
const secrets = require('../config/secrets');

const fileSize = 1024 * 1024 * 5;

function deSpecialCharacter(value) {
  let sanitized = value;
  sanitized = sanitized.replace(/ /g, '_');
  sanitized = sanitized.replace(/,/g, '');
  sanitized = sanitized.replace(/\(/g, '');
  sanitized = sanitized.replace(/\)/g, '');
  sanitized = sanitized.replace(/\[/g, '');
  sanitized = sanitized.replace(/\]/g, '');
  sanitized = sanitized.replace(/\{/g, '');
  sanitized = sanitized.replace(/\}/g, '');
  sanitized = sanitized.replace(/\//g, '-');
  sanitized = sanitized.replace(/\\/g, '-');
  return sanitized;
}

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only jpg and png allowed as filetype.'), false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${secrets.imagePath}images/uploads/`);
  },
  filename: (req, file, cb) => {
    const newName = `${Date.now()}_${deSpecialCharacter(file.originalname)}`;
    cb(null, newName);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize,
  },
});

const fileFilterCSV = (req, file, cb) => {
  if (file.mimetype === 'text/csv') {
    cb(null, true);
  } else {
    cb(new Error('Only csv allowed as filetype.'), false);
  }
};

const storageCSV = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${secrets.imagePath}images/static`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_csv.csv`);
  },
});

const uploadCSV = multer({
  storage: storageCSV,
  fileFilter: fileFilterCSV,
  limits: {
    fileSize,
  },
});

const fileFilterJSON = (req, file, cb) => {
  if (file.mimetype === 'application/json') {
    cb(null, true);
  } else {
    cb(new Error('Only json allowed as filetype.'), false);
  }
};

const storageJSON = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${secrets.imagePath}images/static`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_json.json`);
  },
});

const uploadJSON = multer({
  storage: storageJSON,
  fileFilter: fileFilterJSON,
  limits: {
    fileSize,
  },
});

module.exports = {
  upload,
  uploadCSV,
  uploadJSON,
};
