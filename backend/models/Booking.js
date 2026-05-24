const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    userEmail: String,
    userName: String,
    hotelName: String,
    roomType: String,
    price: Number,
    checkIn: String,
    checkOut: String,
    status: { type: String, default: "Pending" },
    assignedMitra: { type: String, default: "Auto-Assign" },
    mitraEmail: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);