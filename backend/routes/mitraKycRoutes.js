const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const kycController = require('../controllers/mitraKycController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

const isVercelServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadRoot = isVercelServerless
    ? path.join('/tmp', 'gyangarbh-uploads', 'kyc-docs')
    : path.join(__dirname, '..', 'uploads', 'kyc-docs');

const ensureUploadRoot = () => {
    fs.mkdirSync(uploadRoot, { recursive: true });
    return uploadRoot;
};

const storage = multer.diskStorage({
    destination(req, file, callback) {
        try {
            callback(null, ensureUploadRoot());
        } catch (error) {
            callback(error);
        }
    },
    filename(req, file, callback) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        callback(null, `mitra-kyc-${req.user?.id || 'guest'}-${file.fieldname}-${uniqueSuffix}${safeExt}`);
    }
});

const fileFilter = (req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        return callback(null, true);
    }

    return callback(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF files are allowed.'));
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

const kycUploadFields = upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'businessRegistration', maxCount: 1 }
]);

const handleUploadErrors = (req, res, next) => {
    kycUploadFields(req, res, (error) => {
        if (!error) return next();

        const message = error instanceof multer.MulterError
            ? error.message
            : error.message || 'Unable to upload KYC documents.';

        return res.status(400).json({ success: false, message });
    });
};

router.get('/status', requireAuth(['mitra']), kycController.getKycStatus);
router.post('/submit', requireAuth(['mitra']), handleUploadErrors, kycController.submitKyc);
router.get('/details', requireAuth(['mitra']), kycController.getKycDetails);
router.patch('/:mitraId/review', requireAuth(['admin']), requireAdmin, kycController.reviewKycStatus);

module.exports = router;
