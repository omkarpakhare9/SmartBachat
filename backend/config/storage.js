const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage types
const STORAGE_TYPES = {
  LOCAL: 'local',
  S3: 's3'
};

// Local storage configuration
const setupLocalStorage = () => {
  const uploadDir = path.join(__dirname, '../uploads/receipts');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// S3 storage configuration (using multer-s3)
const setupS3Storage = () => {
  try {
    const multerS3 = require('multer-s3');
    const aws = require('aws-sdk');

    const s3 = new aws.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    return multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET,
      acl: 'private',
      metadata: (req, file, cb) => {
        cb(null, {
          userId: req.user.id,
          originalName: file.originalname
        });
      },
      key: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const key = `receipts/${req.user.id}/${uniqueSuffix}${path.extname(file.originalname)}`;
        cb(null, key);
      }
    });
  } catch (error) {
    console.error('S3 setup failed:', error);
    return null;
  }
};

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed types: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX'));
  }
};

// Setup multer based on configured storage
const getMulterInstance = () => {
  const storageType = process.env.STORAGE_TYPE || STORAGE_TYPES.LOCAL;
  let storage;

  if (storageType === STORAGE_TYPES.S3) {
    storage = setupS3Storage();
    if (!storage) {
      console.warn('S3 setup failed, falling back to local storage');
      storage = setupLocalStorage();
    }
  } else {
    storage = setupLocalStorage();
  }

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });
};

module.exports = {
  STORAGE_TYPES,
  getMulterInstance,
  setupLocalStorage,
  setupS3Storage
};
