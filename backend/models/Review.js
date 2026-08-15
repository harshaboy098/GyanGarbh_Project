const mongoose = require('mongoose');

const ratingCategorySchema = new mongoose.Schema({
    cleanliness: { type: Number, required: true, min: 1, max: 5 },
    staffBehavior: { type: Number, required: true, min: 1, max: 5 },
    amenitiesAccuracy: { type: Number, required: true, min: 1, max: 5 },
    location: { type: Number, required: true, min: 1, max: 5 },
    valueForMoney: { type: Number, required: true, min: 1, max: 5 }
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true, trim: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    categories: { type: ratingCategorySchema, required: true },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    isVerifiedStay: { type: Boolean, default: true, index: true },
    disputeStatus: { type: String, enum: ['none', 'flagged_48h', 'under_review', 'resolved'], default: 'none', index: true },
    disputeDeadline: Date,
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now }
});

ReviewSchema.index({ hotelId: 1, createdAt: -1 });
ReviewSchema.index({ hotelId: 1, userEmail: 1, bookingId: 1 }, { unique: true });

module.exports = mongoose.models.Review || mongoose.model('Review', ReviewSchema);