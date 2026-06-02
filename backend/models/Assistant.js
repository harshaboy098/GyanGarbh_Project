const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Assistant Schema - Admins can create assistants to manage content
const assistantSchema = new mongoose.Schema({
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
    role: {
        type: String,
        default: 'assistant',
        enum: ['assistant', 'manager']
    },
    permissions: {
        manageHotels: { type: Boolean, default: true },
        manageCustomers: { type: Boolean, default: true },
        manageMitra: { type: Boolean, default: true },
        manageBookings: { type: Boolean, default: false },
        viewReports: { type: Boolean, default: false }
    },
    createdBy: {
        type: String, // Admin email who created this assistant
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
assistantSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
assistantSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Assistant', assistantSchema);
