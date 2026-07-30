const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    userName: { type: String, required: true, trim: true },
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', index: true },
    hotelName: { type: String, required: true, trim: true },
    roomId: { type: String, default: "", trim: true },
    roomType: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    nightlyRate: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },
    guests: { type: Number, default: 1, min: 1 },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: "Pending" },
    paymentStatus: { type: String, default: "Pay at Hotel" },
    checkedIn: { type: Boolean, default: false },
    cancellationReason: { type: String, default: "" },
    cancelledAt: Date,
    autoReleased: { type: Boolean, default: false },
    assignedMitra: { type: String, default: "Auto-Assign" },
    assignedMitraId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mitraEmail: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);
