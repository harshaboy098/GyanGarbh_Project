const mongoose = require('mongoose');

const rideRequestSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerEmail: { type: String, required: true, trim: true, lowercase: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, default: '', trim: true },
    pickup: {
        label: { type: String, required: true },
        lat: Number,
        lng: Number
    },
    dropoff: {
        label: { type: String, required: true },
        lat: Number,
        lng: Number
    },
    vehicleType: { type: String, enum: ['bike', 'auto', 'sedan', 'suv', 'tempo'], default: 'sedan' },
    estimatedDistanceKm: { type: Number, default: 0 },
    estimatedFare: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['requested', 'assigned', 'arriving', 'completed', 'cancelled'],
        default: 'requested',
        index: true
    },
    taxiId: { type: mongoose.Schema.Types.ObjectId, ref: 'Taxi', default: null },
    assignedDriverName: { type: String, default: '' },
    assignedDriverPhone: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('RideRequest', rideRequestSchema);
