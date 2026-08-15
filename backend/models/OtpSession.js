const mongoose = require('mongoose');

const OtpSessionSchema = new mongoose.Schema({
    identifier: { type: String, required: true, trim: true, lowercase: true, index: true },
    purpose: { type: String, required: true, trim: true, index: true },
    codeHash: { type: String, default: '', trim: true },
    sessionData: { type: mongoose.Schema.Types.Mixed, default: {} },
    setupTokenHash: { type: String, default: '', trim: true },
    resetTokenHash: { type: String, default: '', trim: true },
    verifiedAt: Date,
    consumedAt: Date,
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    createdAt: { type: Date, default: Date.now }
});

OtpSessionSchema.index({ identifier: 1, purpose: 1, consumedAt: 1 });

module.exports = mongoose.models.OtpSession || mongoose.model('OtpSession', OtpSessionSchema);