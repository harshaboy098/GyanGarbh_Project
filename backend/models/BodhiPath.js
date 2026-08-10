const mongoose = require('mongoose');

// Bodhi Path - Cultural & Heritage Information about Bodh Gaya
const bodhiPathSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    title: {
        type: String,
        required: true
    },
    type: { type: String, trim: true, default: 'Temple' },
    category: {
        type: String,
        required: true,
        enum: ['temple', 'monastery', 'circuit-route', 'sacred-tree', 'history', 'monument', 'festival', 'tradition']
    },
    tagline: { type: String, trim: true },
    shortDescription: {
        type: String,
        required: true
    },
    fullDescription: {
        type: String,
        required: true
    },
    significance: {
        type: String
    },
    historicalFacts: [String],
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    imageUrl: {
        type: String,
        default: ''
    },
    coverImage: {
        type: String,
        default: ''
    },
    images: [String], // Multiple images
    galleryImages: [String],
    routeDetails: {
        startingPoint: { type: String, default: '' },
        keyStops: [String],
        estimatedDuration: { type: String, default: '' },
        estimatedKm: { type: String, default: '' },
        bestTimeToVisit: { type: String, default: '' }
    },
    bestTimeToVisit: String,
    visitingHours: String,
    openingHours: String,
    entryFee: String,
    estimatedVisitTime: String, // e.g., "2-3 hours"
    relatedTemples: [String], // Names of related temples
    spiritualSignificance: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // Activity tracking and role-visible audit trail
    updatedBy: { type: String, default: null }, // Email of who last updated
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    auditLogs: [{
        updatedBy: { type: String, default: 'System' },
        role: { type: String, default: 'system' },
        action: { type: String, default: 'UPDATED' },
        timestamp: { type: Date, default: Date.now },
        changes: { type: String, default: '' }
    }],
    isLocked: { type: Boolean, default: false } // Status toggle for lock
});

module.exports = mongoose.model('BodhiPath', bodhiPathSchema);
