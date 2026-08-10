const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    sectionId: { type: String, required: true, trim: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    badgeText: { type: String, default: '' },
    ctaLink: { type: String, default: '' },
    active: { type: Boolean, default: true }
}, { _id: true });

const loginBannerSchema = new mongoose.Schema({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    badgeText: { type: String, default: '' },
    active: { type: Boolean, default: true }
}, { _id: true });

const siteSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true, index: true },
    activeTheme: {
        type: String,
        enum: ['spiritual-gold', 'modern-blue', 'minimal-dark', 'heritage-vibe'],
        default: 'spiritual-gold'
    },
    heroLayout: { type: String, enum: ['centered', 'split', 'search-first'], default: 'centered' },
    heroBanners: [bannerSchema],
    loginBanners: [loginBannerSchema],
    customColors: {
        primary: { type: String, default: '#ff6b00' },
        accent: { type: String, default: '#f59e0b' }
    },
    typography: {
        headingFont: { type: String, default: 'Inter' },
        bodyFont: { type: String, default: 'Inter' }
    },
    updatedBy: { type: String, default: 'system' },
    updatedByRole: { type: String, default: 'system' }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
