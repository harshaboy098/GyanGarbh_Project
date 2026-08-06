const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    actionType: {
        type: String,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'TOGGLE_STATUS', 'SECURITY', 'CRITICAL_ATTACK'],
        required: true,
        index: true
    },
    entityType: {
        type: String,
        enum: ['Hotel', 'BodhiPath', 'Assistant', 'Customer', 'Mitra', 'Staff', 'Security', 'Booking', 'Complaint', 'Warning'],
        required: true,
        index: true
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    entityName: { type: String, trim: true, default: '' },
    performedBy: { type: String, trim: true, default: 'system' },
    performedByRole: {
        type: String,
        enum: ['admin', 'assistant', 'support', 'specialist', 'driver', 'system'],
        required: true
    },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
});

activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
