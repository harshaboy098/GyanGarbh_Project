const mongoose = require('mongoose');

const templeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: String,
        trim: true,
        default: ''
    },
    timings: {
        type: String,
        trim: true,
        default: ''
    },
    entryFee: {
        type: String,
        trim: true,
        default: ''
    },
    mainImage: {
        type: String,
        trim: true,
        default: ''
    },
    galleryImages: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    history: {
        type: String,
        trim: true,
        default: ''
    },
    rulesAndGuidelines: {
        type: [String],
        default: []
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.models.Temple || mongoose.model('Temple', templeSchema);
