const mongoose = require('mongoose');

// User ka saancha (Schema) taiyar kar rahe hain
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // Ek hi email se do log nahi jud sakte
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
        default: 'guest' // Default role
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

// Is saanche ko 'User' naam se export kar rahe hain
module.exports = mongoose.model('User', userSchema);
