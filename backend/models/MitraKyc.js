const mongoose = require('mongoose');

const KYC_STATUSES = ['not_submitted', 'pending', 'verified', 'rejected', 'resubmission_required'];
const DOCUMENT_FIELDS = ['idFront', 'idBack', 'addressProof', 'businessRegistration'];

const kycDocumentSchema = new mongoose.Schema({
    fieldName: { type: String, enum: DOCUMENT_FIELDS, required: true },
    originalName: { type: String, default: '' },
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const mitraKycSchema = new mongoose.Schema({
    mitra: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    docType: { type: String, default: '', trim: true },
    idNumber: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    documents: { type: [kycDocumentSchema], default: [] },
    status: { type: String, enum: KYC_STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, default: '', trim: true },
    reviewRemarks: { type: String, default: '', trim: true },
    reviewedBy: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

mitraKycSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.models.MitraKyc || mongoose.model('MitraKyc', mitraKycSchema);
