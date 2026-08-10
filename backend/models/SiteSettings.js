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

const uploadedAssetSchema = new mongoose.Schema({
    imageUrl: { type: String, required: true },
    publicId: { type: String, default: '' },
    sectionId: { type: String, default: 'home' },
    label: { type: String, default: '' },
    uploadedBy: { type: String, default: 'system' },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const socialLinkSchema = new mongoose.Schema({
    label: { type: String, default: '' },
    url: { type: String, default: '' },
    icon: { type: String, default: 'bi-link-45deg' }
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true, index: true },
    activeTheme: {
        type: String,
        enum: ['spiritual-gold', 'modern-blue', 'agoda-clean', 'minimal-dark', 'heritage-vibe'],
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
    navbar: {
        brandText: { type: String, default: 'Gyan Garbh' },
        logoUrl: { type: String, default: '' }
    },
    announcementBar: {
        text: { type: String, default: 'Get 15% OFF on Bodhi Path Heritage Tours' },
        link: { type: String, default: 'hotel.html' },
        active: { type: Boolean, default: true }
    },
    searchOverlay: {
        destinationPlaceholder: { type: String, default: 'Search Bodhgaya hotels or temple routes' },
        checkInLabel: { type: String, default: 'Check-in' },
        checkOutLabel: { type: String, default: 'Check-out' },
        guestsLabel: { type: String, default: 'Pilgrims' },
        buttonText: { type: String, default: 'Search' }
    },
    footer: {
        copyrightText: { type: String, default: '? 2026 Gyan Garbh. All rights reserved.' },
        socialLinks: [socialLinkSchema]
    },
    uploadedAssets: [uploadedAssetSchema],
    updatedBy: { type: String, default: 'system' },
    updatedByRole: { type: String, default: 'system' }
}, { timestamps: true });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
