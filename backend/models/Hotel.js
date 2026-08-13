const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Hotel Room Database Schema
const roomSchema = {
    roomType: String, // AC, Non-AC, Deluxe
    price: Number,
    roomsAvailable: Number,
    amenities: [String], // ["WiFi", "TV", "AC", "Power Backup"]
    images: [String], // Photos ke links
    status: { type: String, default: 'Available' } // Available or Booked
};

const HotelSchema = new mongoose.Schema({
    hotelName: { type: String, required: true },
    ownerEmail: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: false },
    address: { type: String, required: false },
    location: { type: String, required: true },
    rooms: { type: [roomSchema], default: [] },
    
    // 👈 NEW FIELDS FOR HOTEL DETAILS
    totalRooms: { type: Number, default: 10 },
    acRoomPrice: { type: Number, default: 2000 },
    nonAcRoomPrice: { type: Number, default: 1200 },
    facilities: {
        wifi: { type: Boolean, default: false },
        food: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        laundry: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        frontDesk: { type: Boolean, default: false }
    },
    imageUrl: { type: String, default: "https://images.unsplash.com/photo-1566073771259-6a8506099945" },
    imageUrl2: { type: String, default: "" },
    imageUrl3: { type: String, default: "" },
    images: { type: [String], default: [] },
    
    // 🆕 NEW FIELDS - Distance from Landmark & Gyan Garbh Highlights
    distanceFromLandmark: {
        value: { type: Number, default: 0 },
        unit: { type: String, default: 'km' },
        landmark: { type: String, default: 'Mahabodhi Temple' }
    },
    gyanGarbhHighlights: {
        type: String,
        default: ""
    },
    
    // Original fields
    roomRate: { type: Number, default: 1500 },
    rating: { type: Number, default: 4.0 },
    description: { type: String, default: "Luxury stay in the heart of Bodhgaya" },
    createdAt: { type: Date, default: Date.now },
    
    // ⭐ NEW FIELDS FOR ACTIVITY TRACKING
    updatedBy: { type: String, default: null }, // Email of who last updated
    updatedAt: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false }, // Status toggle for lock
    isAvailable: { type: Boolean, default: true },
    reviews: [{
        rating: Number,
        comment: String,
        date: { type: Date, default: Date.now }
    }],
    averageRating: { type: Number, default: 4.0 },
    totalReviews: { type: Number, default: 0 },
    applicationRequestId: { type: String, default: '' },
    applicationTrackingLink: { type: String, default: '' },
    applicationSubmittedAt: { type: Date, default: null }
});

HotelSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;
    this.password = await bcrypt.hash(this.password, 10);
});

HotelSchema.methods.comparePassword = function(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.Hotel || mongoose.model('Hotel', HotelSchema);
