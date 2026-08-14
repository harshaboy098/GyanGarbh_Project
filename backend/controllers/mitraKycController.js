const MitraKyc = require('../models/MitraKyc');
const User = require('../models/User');

const REVIEW_STATUSES = ['verified', 'rejected', 'resubmission_required'];

const sanitizeText = (value) => String(value || '').trim();

const serializeKyc = (kyc) => {
    if (!kyc) {
        return {
            status: 'not_submitted',
            submittedAt: null,
            rejectionReason: null
        };
    }

    return {
        id: String(kyc._id),
        mitra: String(kyc.mitra),
        email: kyc.email,
        docType: kyc.docType,
        idNumber: kyc.idNumber,
        address: kyc.address,
        documents: kyc.documents,
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        rejectionReason: kyc.rejectionReason || null,
        reviewRemarks: kyc.reviewRemarks || '',
        reviewedBy: kyc.reviewedBy || '',
        reviewedAt: kyc.reviewedAt || null,
        updatedAt: kyc.updatedAt
    };
};

const filesToDocuments = (files = {}) => Object.entries(files).flatMap(([fieldName, entries]) =>
    (entries || []).map((file) => ({
        fieldName,
        originalName: file.originalname || '',
        filename: file.filename,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size || 0,
        uploadedAt: new Date()
    }))
);

exports.getKycStatus = async (req, res, next) => {
    try {
        const kyc = await MitraKyc.findOne({ mitra: req.user._id }).lean();

        return res.status(200).json({
            success: true,
            status: kyc?.status || 'not_submitted',
            submittedAt: kyc?.submittedAt || null,
            rejectionReason: kyc?.rejectionReason || null
        });
    } catch (error) {
        return next(error);
    }
};

exports.submitKyc = async (req, res, next) => {
    try {
        const { docType, idNumber, address } = req.body;
        const documents = filesToDocuments(req.files);

        if (!req.files?.idFront?.length) {
            return res.status(400).json({
                success: false,
                message: 'Primary ID front image/document is required.'
            });
        }

        const update = {
            mitra: req.user._id,
            email: req.user.email,
            docType: sanitizeText(docType),
            idNumber: sanitizeText(idNumber),
            address: sanitizeText(address),
            documents,
            status: 'pending',
            rejectionReason: '',
            reviewRemarks: '',
            reviewedBy: '',
            reviewedAt: null,
            submittedAt: new Date()
        };

        const kyc = await MitraKyc.findOneAndUpdate(
            { mitra: req.user._id },
            { $set: update },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        await User.updateOne(
            { _id: req.user._id },
            { $set: { kycStatus: 'Pending Verification' } },
            { strict: false }
        ).catch(() => {});

        return res.status(200).json({
            success: true,
            message: 'KYC documents submitted successfully for review.',
            status: kyc.status,
            kycData: serializeKyc(kyc)
        });
    } catch (error) {
        return next(error);
    }
};

exports.getKycDetails = async (req, res, next) => {
    try {
        const kyc = await MitraKyc.findOne({ mitra: req.user._id }).lean();

        return res.status(200).json({
            success: true,
            kycData: serializeKyc(kyc)
        });
    } catch (error) {
        return next(error);
    }
};

exports.reviewKycStatus = async (req, res, next) => {
    try {
        const { mitraId } = req.params;
        const status = sanitizeText(req.body.status);
        const remarks = sanitizeText(req.body.remarks || req.body.rejectionReason);

        if (!REVIEW_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        const kyc = await MitraKyc.findOneAndUpdate(
            { mitra: mitraId },
            {
                $set: {
                    status,
                    rejectionReason: status === 'rejected' || status === 'resubmission_required' ? remarks : '',
                    reviewRemarks: remarks,
                    reviewedBy: req.user.email,
                    reviewedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        );

        if (!kyc) {
            return res.status(404).json({ success: false, message: 'KYC application not found.' });
        }

        const userStatus = {
            verified: 'Verified',
            rejected: 'Rejected',
            resubmission_required: 'Rejected'
        }[status];

        await User.updateOne(
            { _id: mitraId },
            { $set: { kycStatus: userStatus } },
            { strict: false }
        ).catch(() => {});

        return res.status(200).json({
            success: true,
            message: `Mitra KYC status updated to ${status}.`,
            kycData: serializeKyc(kyc)
        });
    } catch (error) {
        return next(error);
    }
};
