const mongoose = require('mongoose');

const taxiSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, required: true, trim: true },
    vehicleType: {
        type: String,
        enum: ['bike', 'auto', 'sedan', 'suv', 'tempo'],
        required: true
    },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    liveStatus: {
        type: String,
        enum: ['available', 'busy', 'offline'],
        default: 'available',
        index: true
    },
    baseLocation: {
        label: { type: String, default: 'Bodh Gaya' },
        lat: { type: Number, default: 24.6951 },
        lng: { type: Number, default: 84.9913 }
    },
    currentLocation: {
        label: { type: String, default: 'Bodh Gaya' },
        lat: { type: Number, default: 24.6951 },
        lng: { type: Number, default: 84.9913 }
    },
    createdBy: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Taxi || mongoose.model('Taxi', taxiSchema);
