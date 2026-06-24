const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['admin', 'assistant', 'support', 'driver', 'customer', 'mitra'];

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
    date: {
        type: Date,
        default: Date.now
    },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false }
});

userSchema.index({ phone: 1 });
userSchema.index({ name: 1, dob: 1, phone: 1 });

userSchema.pre('validate', function(next) {
    if (!this.fullName && this.name) this.fullName = this.name;
    if (!this.name && this.fullName) this.name = this.fullName;
    if (this.address && !this.villageCity) this.villageCity = this.address;
    next();
});

// ⭐ FIX: Pure async pre-save middleware (removed next parameter to avoid conflict)
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);