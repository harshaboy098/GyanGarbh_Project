const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['admin', 'assistant', 'customer'];

// Application user schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
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
        required: false // Optional for Google login users initially
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
    googleId: {
        type: String,
        required: false // For Google login users
    },
    photoURL: {
        type: String,
        required: false // Google profile picture
    },
    date: {
        type: Date,
        default: Date.now // Jab user banega, aaj ki date apne aap save ho jayegi
    },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false }
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
