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
    selectedAddons: {
        mitraAssistance: {
            selected: { type: Boolean, default: false },
            fee: { type: Number, default: 0, min: 0 },
            status: { type: String, enum: ['not_requested', 'requested', 'assigned', 'completed'], default: 'not_requested' }
        },
        pickupDrop: {
            selected: { type: Boolean, default: false },
            fee: { type: Number, default: 0, min: 0 },
            vehicleType: { type: String, default: 'Standard Cab', trim: true },
            status: { type: String, enum: ['not_requested', 'requested', 'arranged', 'completed'], default: 'not_requested' }
        },
        remarks: { type: String, default: '', trim: true }
    },
    guestDetails: {
        name: { type: String, default: '', trim: true },
        phone: { type: String, default: '', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        guests: { type: Number, default: 1, min: 1 }
    },
    pricingBreakdown: {
        roomSubtotal: { type: Number, default: 0, min: 0 },
        addonTotal: { type: Number, default: 0, min: 0 },
        taxAmount: { type: Number, default: 0, min: 0 },
        grandTotal: { type: Number, default: 0, min: 0 }
    },
    assignmentStatus: { type: String, enum: ['auto_assigned', 'assignment_requested', 'assigned', 'not_required'], default: 'not_required' },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: "Pending" },
    paymentStatus: { type: String, default: "Pay at Hotel" },
    paymentProvider: { type: String, default: "", trim: true },
    paymentMode: { type: String, enum: ['pay_at_hotel', 'authorize'], default: 'pay_at_hotel' },
    paymentOrderId: { type: String, default: "", trim: true },
    paymentId: { type: String, default: "", trim: true },
    paymentSignature: { type: String, default: "", trim: true },
    paymentAuthorizationId: { type: String, default: "", trim: true },
    paymentCaptureId: { type: String, default: "", trim: true },
    paymentAuthorizedAt: Date,
    paymentCapturedAt: Date,
    paymentVoidedAt: Date,
    freeCancellationUntil: Date,
    bookingReference: { type: String, default: "", trim: true, index: true },
    qrPassTokenHash: { type: String, default: "", trim: true },
    qrPassIssuedAt: Date,
    checkedIn: { type: Boolean, default: false },
    checkedInAt: Date,
    checkedInBy: { type: String, default: "", trim: true },
    cancellationReason: { type: String, default: "" },
    cancelledAt: Date,
    autoReleased: { type: Boolean, default: false },
    assignedMitra: { type: String, default: "Auto-Assign" },
    assignedMitraId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mitraEmail: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

