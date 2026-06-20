const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['admin', 'assistant', 'support', 'driver', 'customer', 'mitra'];

// Application user schema
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
        required: false // Optional for Google login users initially
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
        required: false // For Google login users
    },
    photoURL: {
        type: String,
        required: false // Google profile picture
    },
    profilePic: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        default: Date.now // Jab user banega, aaj ki date apne aap save ho jayegi
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

// Hash only when the password field is actually changed.
// The bcrypt prefix guard protects current routes that already pass hashed passwords.
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
