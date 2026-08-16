const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['admin', 'assistant', 'support', 'specialist', 'driver', 'customer', 'mitra'];
const MITRA_ROLE_CATEGORIES = ['Heritage Guide', 'Travel Partner / Driver', 'Stay Escort', 'Market & Craft Guide'];
const MITRA_KYC_STATUSES = ['Pending Verification', 'Verified', 'Rejected'];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: false,
        trim: true,
        sparse: true
    },
    dob: {
        type: Date,
        default: null
    },
    villageCity: {
        type: String,
        default: '',
        trim: true
    },
    pinCode: {
        type: String,
        default: '',
        trim: true
    },
    address: {
        type: String,
        required: false
    },
    role: {
        type: String,
        enum: USER_ROLES,
        default: 'customer'
    },
    supportTier: {
        type: String,
        enum: ['tier1', 'specialist', 'assistant', 'admin', 'none'],
        default: 'none'
    },
    assignedHotels: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hotel'
        }],
        default: []
    },
    lastActive: {
        type: Date,
        default: null
    },
    experience: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    serviceArea: {
        type: String,
        default: '',
        trim: true
    },
    languagesSpoken: {
        type: [String],
        default: []
    },
    emergencyContact: {
        name: { type: String, default: '', trim: true },
        phone: { type: String, default: '', trim: true },
        relation: { type: String, default: '', trim: true }
    },
    mitraVerification: {
        documentType: { type: String, default: '', trim: true },
        documentNumber: { type: String, default: '', trim: true },
        documentFileName: { type: String, default: '', trim: true },
        documentPreviewUrl: { type: String, default: '', trim: true },
        submittedAt: { type: Date, default: null }
    },
    kycStatus: {
        type: String,
        default: 'Not Submitted'
    },
    googleId: {
        type: String,
        required: false
    },
    photoURL: {
        type: String,
        required: false
    },
    profilePic: {
        type: String,
        default: ''
    },
    refundDetails: {
        upiId: { type: String, default: '', trim: true },
        bankInfo: {
            accountNumber: { type: String, default: '', trim: true },
            ifsc: { type: String, default: '', trim: true, uppercase: true },
            accountHolderName: { type: String, default: '', trim: true }
        },
        preferredMethod: {
            type: String,
            enum: ['upi', 'bank', 'wallet'],
            default: 'wallet'
        },
        updatedAt: { type: Date, default: null }
    },
    date: {
        type: Date,
        default: Date.now
    },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false }
});

userSchema.index({ name: 1, dob: 1, phone: 1 });

userSchema.pre('validate', function() {
    if (!this.fullName && this.name) this.fullName = this.name;
    if (!this.name && this.fullName) this.name = this.fullName;
    if (this.address && !this.villageCity) this.villageCity = this.address;
});

// ⭐ ASYNC FIX: Removed 'next' completely from parameter and call stack
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
