const mongoose = require('mongoose');

// Bodhi Path - Cultural & Heritage Information about Bodh Gaya
const bodhiPathSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['temple', 'history', 'monument', 'festival', 'tradition']
    },
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
        default: ""
    },
    images: [String], // Multiple images
    bestTimeToVisit: String,
    visitingHours: String,
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
    
    // ⭐ NEW FIELDS FOR ACTIVITY TRACKING
    updatedBy: { type: String, default: null }, // Email of who last updated
    isLocked: { type: Boolean, default: false } // Status toggle for lock
});

module.exports = mongoose.model('BodhiPath', bodhiPathSchema);
