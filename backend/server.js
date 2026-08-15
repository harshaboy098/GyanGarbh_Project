const dns = require('dns');

// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Google DNS ko force karein taaki local internet block bypass ho jaye

dns.setServers(['8.8.8.8', '8.8.4.4']);

if (dns.setDefaultResultOrder) {

    dns.setDefaultResultOrder('ipv4first');

}



const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');

const http = require('http');

const mongoose = require('mongoose');

const cors = require('cors');

const helmet = require('helmet');

const rateLimit = require('express-rate-limit');

const mongoSanitize = require('express-mongo-sanitize');

const crypto = require('crypto');
const https = require('https');

const bcrypt = require('bcryptjs');

const axios = require('axios');

const cloudinary = require('cloudinary').v2;

const multer = require('multer');

const { Server } = require('socket.io');

const { OAuth2Client } = require('google-auth-library');



// Models

const User = require('./models/User');

const Booking = require('./models/Booking');

const Hotel = require('./models/Hotel');

const Assistant = require('./models/Assistant');

const BodhiPath = require('./models/BodhiPath');

const ActivityLog = require('./models/ActivityLog');

const SupportTicket = require('./models/SupportTicket');

const Taxi = require('./models/Taxi');

const RideRequest = require('./models/RideRequest');
const SiteSettings = require('./models/SiteSettings');
const Review = require('./models/Review');
const MitraKyc = require('./models/MitraKyc');
const templeRoutes = require('./routes/templeRoutes');
const mitraKycRoutes = require('./routes/mitraKycRoutes');



const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN = /^[+]?[\d\s()-]{7,20}$/;

const PASSWORD_MIN_LENGTH = 8;
const MITRA_KYC_STATUS_VALUES = ['Pending Verification', 'Verified', 'Rejected'];

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const RESET_TTL_MS = 10 * 60 * 1000;

const realtimeClients = new Set();



const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value));

const isValidPhone = (value) => !value || PHONE_PATTERN.test(String(value).trim());

const isStrongEnoughPassword = (value) => typeof value === 'string' && value.length >= PASSWORD_MIN_LENGTH;


const REFUND_METHODS = ['upi', 'bank', 'wallet'];
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_ACCOUNT_PATTERN = /^\d{9,18}$/;
const ACCOUNT_HOLDER_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,79}$/;

const normalizeRefundDetails = (payload = {}, existing = {}) => {
    const source = payload.refundDetails && typeof payload.refundDetails === 'object' ? payload.refundDetails : payload;
    const existingBank = existing.bankInfo || {};
    const cleanMethod = String(source.preferredMethod || existing.preferredMethod || 'wallet').trim().toLowerCase();
    const preferredMethod = cleanMethod === 'bank_account' ? 'bank' : cleanMethod;
    const upiId = String(source.upiId ?? existing.upiId ?? '').trim();
    const bankSource = source.bankInfo && typeof source.bankInfo === 'object' ? source.bankInfo : source;
    const bankInfo = {
        accountNumber: String(bankSource.accountNumber ?? existingBank.accountNumber ?? '').replace(/\s/g, '').trim(),
        ifsc: String(bankSource.ifsc ?? existingBank.ifsc ?? '').replace(/\s/g, '').trim().toUpperCase(),
        accountHolderName: String(bankSource.accountHolderName ?? existingBank.accountHolderName ?? '').trim()
    };
    const errors = [];

    if (!REFUND_METHODS.includes(preferredMethod)) errors.push('Default refund method must be UPI, Bank Account, or Gyan Garbh Wallet.');
    if ((upiId || preferredMethod === 'upi') && !UPI_ID_PATTERN.test(upiId)) errors.push('Enter a valid UPI ID, for example name@bank.');

    const hasAnyBankInfo = Boolean(bankInfo.accountNumber || bankInfo.ifsc || bankInfo.accountHolderName);
    if (hasAnyBankInfo || preferredMethod === 'bank') {
        if (!BANK_ACCOUNT_PATTERN.test(bankInfo.accountNumber)) errors.push('Bank account number must be 9 to 18 digits.');
        if (!IFSC_PATTERN.test(bankInfo.ifsc)) errors.push('IFSC must be 11 characters, for example SBIN0001234.');
        if (!ACCOUNT_HOLDER_PATTERN.test(bankInfo.accountHolderName)) errors.push('Account holder name must contain 2 to 80 valid characters.');
    }

    return {
        errors,
        refundDetails: {
            upiId,
            bankInfo,
            preferredMethod: REFUND_METHODS.includes(preferredMethod) ? preferredMethod : 'wallet',
            updatedAt: new Date()
        }
    };
};

const BOOKING_ADDON_FEES = {
    mitraAssistance: Number(process.env.MITRA_ASSISTANCE_FEE || 700),
    pickupDrop: Number(process.env.PICKUP_DROP_FEE || 1200),
    taxRate: Number(process.env.BOOKING_TAX_RATE || 0.12)
};

const normalizeBookingAddons = (body = {}, customer = {}) => {
    const source = body.selectedAddons && typeof body.selectedAddons === 'object' ? body.selectedAddons : body;
    const mitraSelected = source.mitraAssistance === true || source.mitraAssistance?.selected === true;
    const pickupSelected = source.pickupDrop === true || source.pickupDrop?.selected === true;
    const mitraFee = mitraSelected ? Math.max(Number(source.mitraAssistance?.fee ?? body.mitraFee ?? BOOKING_ADDON_FEES.mitraAssistance) || 0, 0) : 0;
    const pickupFee = pickupSelected ? Math.max(Number(source.pickupDrop?.fee ?? body.pickupDropFee ?? BOOKING_ADDON_FEES.pickupDrop) || 0, 0) : 0;
    const roomSubtotal = Math.max(Number(body.roomSubtotal || body.baseRoomTotal || body.totalPrice || body.price || 0) || 0, 0);
    const addonTotal = mitraFee + pickupFee;
    const taxAmount = Math.round((roomSubtotal + addonTotal) * BOOKING_ADDON_FEES.taxRate);
    const grandTotal = Math.max(Number(body.grandTotal || body.finalTotal || 0) || 0, roomSubtotal + addonTotal + taxAmount);

    return {
        selectedAddons: {
            mitraAssistance: {
                selected: mitraSelected,
                fee: mitraFee,
                status: mitraSelected ? 'requested' : 'not_requested'
            },
            pickupDrop: {
                selected: pickupSelected,
                fee: pickupFee,
                vehicleType: String(source.pickupDrop?.vehicleType || body.vehicleType || 'Standard Cab').trim(),
                status: pickupSelected ? 'requested' : 'not_requested'
            },
            remarks: String(source.remarks || body.remarks || '').trim().slice(0, 500)
        },
        guestDetails: {
            name: String(body.guestDetails?.name || body.guestName || customer.fullName || customer.name || '').trim(),
            phone: String(body.guestDetails?.phone || body.guestPhone || customer.phone || '').trim(),
            email: normalizeEmail(body.guestDetails?.email || body.guestEmail || customer.email || ''),
            guests: Math.max(Number(body.guestDetails?.guests || body.guests || 1) || 1, 1)
        },
        pricingBreakdown: { roomSubtotal, addonTotal, taxAmount, grandTotal }
    };
};
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
const RAZORPAY_MOCK_MODE = !(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
const FREE_CANCELLATION_HOURS = Math.max(1, Number(process.env.FREE_CANCELLATION_HOURS || 24));

const sha256Hex = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const toMoneyAmount = (value) => Math.max(0, Math.round(Number(value || 0)));

const toPaise = (value) => Math.max(100, Math.round(Number(value || 0) * 100));

const createBookingReference = (booking) => {
    const id = String(booking?._id || '').slice(-8).toUpperCase();
    return booking?.bookingReference || `GG-${id || crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

const calculateFreeCancellationUntil = (booking) => {
    const checkInDate = new Date(`${booking.checkIn}T00:00:00+05:30`);
    if (!Number.isNaN(checkInDate.getTime())) {
        return new Date(checkInDate.getTime() - (FREE_CANCELLATION_HOURS * 60 * 60 * 1000));
    }
    return new Date(Date.now() + (FREE_CANCELLATION_HOURS * 60 * 60 * 1000));
};

const buildBookingPass = (booking) => {
    const reference = createBookingReference(booking);
    const seed = `${booking._id}|${booking.userEmail}|${booking.createdAt ? new Date(booking.createdAt).getTime() : ''}`;
    const token = crypto.createHmac('sha256', JWT_SECRET).update(`booking-pass:${seed}`).digest('hex').slice(0, 32);
    return {
        reference,
        token,
        payload: JSON.stringify({ type: 'gyan-garbh-stay-pass', bookingId: String(booking._id), reference, token })
    };
};

const decorateBookingForClient = (booking) => {
    const doc = typeof booking?.toObject === 'function' ? booking.toObject() : { ...(booking || {}) };
    delete doc.qrPassTokenHash;
    doc.bookingPass = buildBookingPass(doc);
    return doc;
};

const razorpayRequest = (method, endpoint, body = {}) => new Promise((resolve, reject) => {
    if (RAZORPAY_MOCK_MODE) return reject(new Error('Razorpay keys are not configured'));
    const payload = JSON.stringify(body || {});
    const req = https.request({
        hostname: 'api.razorpay.com',
        path: endpoint,
        method,
        auth: `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
            const parsed = raw ? JSON.parse(raw) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
            reject(new Error(parsed?.error?.description || parsed?.message || `Razorpay request failed with ${res.statusCode}`));
        });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
});

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
    if (RAZORPAY_MOCK_MODE || String(orderId || '').startsWith('order_mock_')) return true;
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    return timingSafeEquals(expected, signature);
};
const validateBookingPayload = ({ userName, hotelName, roomType, price, checkIn, checkOut }) => {

    if (![userName, hotelName, roomType, checkIn, checkOut].every((value) => String(value || '').trim())) {

        return 'Guest, hotel, room type, check-in, and check-out are required';

    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0) return 'A valid room price is required';

    const checkInDate = new Date(checkIn);

    const checkOutDate = new Date(checkOut);

    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {

        return 'Check-out must be after check-in';

    }

    return null;

};

const REVIEW_CATEGORY_KEYS = ['cleanliness', 'staffBehavior', 'amenitiesAccuracy', 'location', 'valueForMoney'];
const COMPLETED_STAY_STATUSES = ['completed', 'checked_out'];
const BAYESIAN_MIN_STAYS = Math.max(3, Number(process.env.GVS_MIN_STAYS || 5));
const GVS_BASELINE_RATING = Number(process.env.GVS_BASELINE_RATING || 4.1);

const normalizeReviewCategories = (body = {}) => {
    const source = body.categories && typeof body.categories === 'object' ? body.categories : body;
    const categories = {
        cleanliness: Number(source.cleanliness),
        staffBehavior: Number(source.staffBehavior),
        amenitiesAccuracy: Number(source.amenitiesAccuracy),
        location: Number(source.location),
        valueForMoney: Number(source.valueForMoney)
    };
    const invalid = REVIEW_CATEGORY_KEYS.find((key) => !Number.isFinite(categories[key]) || categories[key] < 1 || categories[key] > 5);
    if (invalid) return { error: 'All review categories must be rated from 1 to 5.' };
    Object.keys(categories).forEach((key) => { categories[key] = Math.round(categories[key]); });
    const rating = Number((REVIEW_CATEGORY_KEYS.reduce((sum, key) => sum + categories[key], 0) / REVIEW_CATEGORY_KEYS.length).toFixed(1));
    return { categories, rating };
};

const isCompletedStayBooking = (booking) => {
    const status = String(booking?.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return COMPLETED_STAY_STATUSES.includes(status) || (booking?.checkedIn === true && status === 'completed');
};

const summarizeVerifiedReviews = (reviews = []) => {
    const verified = reviews.filter((review) => review.isVerifiedStay !== false);
    const average = verified.length ? verified.reduce((sum, review) => sum + Number(review.rating || 0), 0) / verified.length : GVS_BASELINE_RATING;
    const categoryTotals = REVIEW_CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    verified.forEach((review) => REVIEW_CATEGORY_KEYS.forEach((key) => { categoryTotals[key] += Number(review.categories?.[key] || review.rating || 0); }));
    const categoryBreakdown = REVIEW_CATEGORY_KEYS.reduce((acc, key) => {
        acc[key] = verified.length ? Number((categoryTotals[key] / verified.length).toFixed(1)) : 0;
        return acc;
    }, {});
    return { verified, average, categoryBreakdown };
};

const calculateHotelGvs = ({ hotel, reviews = [], bookings = [] }) => {
    const reviewSummary = summarizeVerifiedReviews(reviews);
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(isCompletedStayBooking).length;
    const confirmedBookings = bookings.filter((booking) => ['confirmed', 'completed'].includes(String(booking.status || '').toLowerCase()) || booking.checkedIn).length;
    const cancelledBookings = bookings.filter((booking) => String(booking.status || '').toLowerCase() === 'cancelled').length;
    const stayBuffer = Math.min(1, completedBookings / BAYESIAN_MIN_STAYS);
    const bayesianRating = ((reviewSummary.average * reviewSummary.verified.length) + (GVS_BASELINE_RATING * BAYESIAN_MIN_STAYS)) / (reviewSummary.verified.length + BAYESIAN_MIN_STAYS);
    const fulfillmentRate = totalBookings ? (completedBookings / totalBookings) * 5 : 4;
    const conversionRate = totalBookings ? (confirmedBookings / totalBookings) * 5 : 3.8;
    const lowReviewPenalty = reviewSummary.verified.filter((review) => Number(review.rating || 0) <= 2).length * 0.35;
    const cancelPenalty = totalBookings ? (cancelledBookings / totalBookings) * 3 : 0;
    const visibilityPenalty = Math.min(5, (lowReviewPenalty + cancelPenalty) * stayBuffer);
    const rawScore = (bayesianRating * 0.40) + (fulfillmentRate * 0.30) + (conversionRate * 0.20) - (visibilityPenalty * 0.10);
    const gvsScore = Number(Math.max(0, Math.min(5, rawScore)).toFixed(2));
    return {
        gvsScore,
        gvsRankStatus: gvsScore >= 4.3 ? 'Top Ranked' : (gvsScore >= 3.6 ? 'Healthy' : (gvsScore >= 3 ? 'Watchlist' : 'Needs Review')),
        avgVerifiedRating: Number(reviewSummary.average.toFixed(1)),
        bayesianRating: Number(bayesianRating.toFixed(2)),
        verifiedReviewCount: reviewSummary.verified.length,
        completedStayCount: completedBookings,
        fulfillmentRate: Number(fulfillmentRate.toFixed(2)),
        conversionRate: Number(conversionRate.toFixed(2)),
        penaltyScore: Number(visibilityPenalty.toFixed(2)),
        categoryBreakdown: reviewSummary.categoryBreakdown
    };
};

const enrichHotelsWithGvs = async (hotels = []) => {
    const docs = hotels.map((hotel) => (typeof hotel?.toObject === 'function' ? hotel.toObject() : { ...(hotel || {}) }));
    const ids = docs.map((hotel) => hotel._id).filter(Boolean);
    const names = docs.map((hotel) => hotel.hotelName).filter(Boolean);
    const [reviews, bookings] = await Promise.all([
        ids.length ? Review.find({ hotelId: { $in: ids } }).sort({ createdAt: -1 }).lean() : [],
        (ids.length || names.length) ? Booking.find({ $or: [{ hotelId: { $in: ids } }, { hotelName: { $in: names } }] }).select('hotelId hotelName status checkedIn createdAt').lean() : []
    ]);
    const reviewsByHotel = new Map();
    reviews.forEach((review) => {
        const key = String(review.hotelId);
        if (!reviewsByHotel.has(key)) reviewsByHotel.set(key, []);
        reviewsByHotel.get(key).push(review);
    });
    const bookingsByHotel = new Map();
    bookings.forEach((booking) => {
        const keys = [booking.hotelId ? String(booking.hotelId) : '', booking.hotelName || ''].filter(Boolean);
        keys.forEach((key) => {
            if (!bookingsByHotel.has(key)) bookingsByHotel.set(key, []);
            bookingsByHotel.get(key).push(booking);
        });
    });
    return docs.map((hotel) => {
        const hotelReviews = reviewsByHotel.get(String(hotel._id)) || [];
        const hotelBookings = bookingsByHotel.get(String(hotel._id)) || bookingsByHotel.get(hotel.hotelName) || [];
        const gvs = calculateHotelGvs({ hotel, reviews: hotelReviews, bookings: hotelBookings });
        return {
            ...hotel,
            reviews: hotelReviews.slice(0, 20),
            averageRating: gvs.avgVerifiedRating || hotel.averageRating || hotel.rating || 0,
            totalReviews: gvs.verifiedReviewCount,
            categoryRatings: gvs.categoryBreakdown,
            gvs
        };
    }).sort((a, b) => (b.gvs?.gvsScore || 0) - (a.gvs?.gvsScore || 0));
};
const publicHotelQuery = (query) => query.where({ isLocked: { $ne: true }, isAvailable: { $ne: false }, isVerified: { $ne: false } }).select('-password');

const publicUserQuery = (query) => query.select('-password');

const publicUserFields = '-password';

const STAFF_ROLES = ['support', 'specialist', 'driver'];

const SUPPORT_TIER_BY_ROLE = {

    support: 'tier1',

    specialist: 'specialist',

    assistant: 'assistant',

    admin: 'admin'

};



const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '').trim();

const parseDob = (value) => {

    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;

};

const dateOnlyRange = (value) => {

    const dob = parseDob(value);

    if (!dob) return null;

    const start = new Date(dob);

    start.setHours(0, 0, 0, 0);

    const end = new Date(start);

    end.setDate(end.getDate() + 1);

    return { $gte: start, $lt: end };

};

const buildSafeUserProfile = (user) => {

    if (!user) return null;

    const source = typeof user.toObject === 'function' ? user.toObject() : user;

    delete source.password;

    return {

        ...source,

        fullName: source.fullName || source.name || '',

        villageCity: source.villageCity || source.address || '',

        profilePic: source.profilePic || source.photoURL || ''

    };

};



// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â NAYA MODEL: Gyan Garbh Control System

const enquirySchema = new mongoose.Schema({

    customerName: String,

    customerEmail: String,

    customerPhone: String,

    mitraName: String,

    status: { type: String, default: 'Pending' },

    createdAt: { type: Date, default: Date.now },

    updatedBy: { type: String, default: null },

    updatedAt: { type: Date, default: Date.now },

    isLocked: { type: Boolean, default: false }

});

const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);



// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ACTIVITY LOG MODEL - Track all changes by Admin/Assistant

const systemNotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'system' },
    entityType: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    audience: [{ type: String, enum: ['admin', 'assistant', 'mitra'], default: 'assistant' }],
    readBy: [{ email: String, role: String, readAt: { type: Date, default: Date.now } }],
    createdBy: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now }
});

const SystemNotification = mongoose.models.SystemNotification || mongoose.model('SystemNotification', systemNotificationSchema);

const app = express();

const server = http.createServer(app);

const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const isVercelServerless = Boolean(process.env.VERCEL);
const uploadsDir = isVercelServerless ? path.join('/tmp', 'gyangarbh-uploads') : path.join(__dirname, 'uploads');
const siteBannerUploadsDir = path.join(uploadsDir, 'site-banners');

function safePathExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        console.warn('Skipping file existence check in serverless environment:', err.message);
        return false;
    }
}

function ensureWritableDirectory(dirPath) {
    try {
        if (!safePathExists(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (err) {
        console.warn('Skipping directory creation in serverless environment:', err.message);
        return false;
    }
}

if (!isVercelServerless) {
    ensureWritableDirectory(uploadsDir);
    ensureWritableDirectory(siteBannerUploadsDir);
}
const FRONTEND_URL = String(process.env.FRONTEND_URL || '').trim().replace(/^['"]|['"]$/g, '');
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://gyan-garbh-project-ten.vercel.app',
    'https://gyan-garbh-project.vercel.app',
    FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: ['https://gyan-garbh-project.vercel.app', 'http://localhost:3000', 'http://localhost:5173', 'https://gyan-garbh-project-ten.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-gyangarbh-admin-shield'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.disable('etag');

app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});
app.use('/uploads/site-banners', express.static(siteBannerUploadsDir, { maxAge: '7d', immutable: true }));

app.get('/uploads/site-banners/:filename', (req, res) => {
    const safeFileName = path.basename(String(req.params.filename || ''));
    const filePath = path.resolve(siteBannerUploadsDir, safeFileName);
    if (!filePath.startsWith(path.resolve(siteBannerUploadsDir) + path.sep)) {
        return res.status(400).json({ success: false, message: 'Invalid file path', data: null });
    }
    if (!safePathExists(filePath)) {
        return res.status(404).json({ success: false, message: 'Image not found', data: null });
    }
    res.sendFile(filePath);
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '47696856369-b8pck7a7n94fsp303ltmmh5qpk4a55dh.apps.googleusercontent.com';

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const isProduction = process.env.NODE_ENV === 'production';

const MONGO_URI = String(process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
const JWT_SECRET = String(process.env.JWT_SECRET || process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')).trim();
if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) process.env.JWT_SECRET = JWT_SECRET;

const SMTP_USER = String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();

const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^['"]|['"]$/g, '');

const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^['"]|['"]$/g, '');



cloudinary.config({

    cloud_name: cloudinaryCloudName,

    api_key: cloudinaryApiKey,

    api_secret: cloudinaryApiSecret,

    secure: true

});



const hasCloudinaryCredentials = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

if (!hasCloudinaryCredentials) {

    console.warn('Cloudinary config warning: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are missing. Image uploads will use local uploads fallback.');

}



const createLocalSiteBannerStorage = () => multer.diskStorage({
    destination(req, file, callback) {
        if (!ensureWritableDirectory(siteBannerUploadsDir)) {
            return callback(new Error('Upload storage is unavailable'));
        }
        callback(null, siteBannerUploadsDir);
    },
    filename(req, file, callback) {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
        callback(null, 'site-banner-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + safeExt);
    }
});

const createCloudinaryStorage = (params) => ({
    _handleFile(req, file, callback) {
        const uploadOptions = {
            ...params,
            resource_type: 'image'
        };

        const upload = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) return callback(error);

            return callback(null, {
                path: result.secure_url,
                filename: result.public_id,
                size: result.bytes
            });
        });

        file.stream.pipe(upload);
    },
    _removeFile(req, file, callback) {
        if (!file.filename) return callback(null);

        cloudinary.uploader.destroy(file.filename, { resource_type: 'image' }, callback);
    }
});

const hotelImageStorage = createCloudinaryStorage({
    folder: 'GyanGarbh/Hotels',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1200, crop: 'limit' }]
});

const siteBannerStorage = createLocalSiteBannerStorage();



const uploadHotelImages = multer({ storage: hotelImageStorage });
const uploadRoomImages = multer({ storage: hotelImageStorage });

const uploadProfilePic = multer({ storage: hotelImageStorage });
const uploadSiteBanner = multer({
    storage: siteBannerStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter(req, file, callback) {
        if (!/^image\/(jpeg|png|webp)$/i.test(file.mimetype || '')) {
            return callback(new Error('Only JPG, PNG, and WEBP images are allowed'));
        }
        callback(null, true);
    }
});

const resolvePublicBaseUrl = (req) => {
    const configured = String(process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '').trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, '');
    if (configured) return configured;
    return req.protocol + '://' + req.get('host');
};

const resolveSiteBannerUrl = (req, file) => {
    if (!file) return '';
    if (/^https?:\/\//i.test(file.path || '')) return file.path;
    const filename = path.basename(file.filename || file.path || '');
    return resolvePublicBaseUrl(req) + '/uploads/site-banners/' + encodeURIComponent(filename);
};


const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const adminAuthRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Not Found' },
    statusCode: 404
});



const io = new Server(server, {

    cors: corsOptions

});



app.use(helmet());

app.use(['/admin-login', '/admin/login', '/api/admin-login', '/api/admin/login'], adminAuthRateLimiter);

app.use(['/login', '/api/login', '/api/auth/login'], loginRateLimiter);

app.use(['/assistant-login', '/assistant/login', '/api/assistant-login', '/api/assistant/login', '/api/assistants/login', '/api/auth/assistant-login'], loginRateLimiter);

function isAssistantLoginRequest(pathname = '') {
    return ['/assistant-login', '/assistant/login', '/api/assistant-login', '/api/assistant/login', '/api/assistants/login', '/api/auth/assistant-login'].includes(String(pathname || '').replace(/\/$/, ''));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Express 5 exposes req.query as a read-only property, so sanitize objects in place.

app.use((req, res, next) => {

    ['body', 'query', 'params'].forEach((key) => {

        if (req[key]) mongoSanitize.sanitize(req[key]);

    });

    next();

});

app.use('/api/temples', templeRoutes);
app.use('/api/mitra/kyc', mitraKycRoutes);



const encodeTokenPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decodeTokenPart = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const getSessionSecret = () => JWT_SECRET;

const normalizeEnterpriseRole = (role) => {

    if (['guest', 'mitra', 'customer'].includes(role)) return 'customer';

    if (['assistant', 'manager'].includes(role)) return 'assistant';

    return role;

};

const signTokenPayload = (payload) => crypto

    .createHmac('sha256', getSessionSecret())

    .update(payload)

    .digest('base64url');

const createSessionToken = (role, email, expiresIn = '8h', extraPayload = {}) => {

    return signJwt({ role, enterpriseRole: normalizeEnterpriseRole(role), email: normalizeEmail(email), ...extraPayload }, expiresIn);

};

const createLegacySessionToken = (role, email) => {

    const encodedPayload = encodeTokenPart({ role, enterpriseRole: normalizeEnterpriseRole(role), email: normalizeEmail(email), exp: Date.now() + SESSION_TTL_MS });

    return `${encodedPayload}.${signTokenPayload(encodedPayload)}`;

};

const verifySessionToken = (token) => {

    try {

        const parts = String(token || '').split('.');

        if (parts.length === 3) return verifyJwtToken(token);

        const [encodedPayload, signature] = parts;

        if (!encodedPayload || !signature) return null;

        const expected = signTokenPayload(encodedPayload);

        if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

        const payload = decodeTokenPart(encodedPayload);

        if (!payload.email || !payload.role || payload.exp < Date.now()) return null;

        payload.enterpriseRole = payload.enterpriseRole || normalizeEnterpriseRole(payload.role);

        return payload;

    } catch {

        return null;

    }

};

const readSessionToken = (req) => {

    const header = String(req.get('authorization') || '');
    let token = null;

    if (header.startsWith('Bearer ')) token = header.slice(7);
    else if (req.query?.token) token = String(req.query.token);
    else {
        const cookieHeader = String(req.get('cookie') || '');
        const cookieMatch = cookieHeader.match(/(?:^|;\s*)(?:authToken|token)=([^;]+)/);
        if (cookieMatch) token = decodeURIComponent(cookieMatch[1] || '');
    }

    if (!token || token === 'null' || token === 'undefined') {
        return null;
    }

    return token;
};

const ADMIN_PANEL_ENTRY = 'x9f2-k8qm-z7p1-v4tw-9821.html';
const ADMIN_SHIELD_HEADER = 'x-gyangarbh-admin-shield';
const ADMIN_SHIELD_SECRET = String(process.env.ADMIN_SHIELD_SECRET || process.env.ADMIN_SHIELD_TOKEN || 'gg-admin-shield-v1-9821').trim();
const ADMIN_MASTER_PIN = String(process.env.ADMIN_MASTER_PIN || '').trim();
const ADMIN_JWT_EXPIRES_IN = '20m';
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const AUDIT_LOG_PATH = path.join(__dirname, 'server.out.log');

const fakeNotFound = (res) => res.status(404).type('text/plain').send('404 Not Found');

const appendAuditLog = (req, action, actor = 'unknown', status = 'info', details = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.socket?.remoteAddress || '',
        userAgent: req.get?.('user-agent') || '',
        method: req.method,
        path: req.originalUrl || req.url,
        action,
        actor,
        status,
        details
    };

    fs.appendFile(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`, (err) => {
        if (err) console.error('Audit append error:', err.message);
    });
};

const timingSafeEquals = (a, b) => {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const requireAdminShield = (req, res, next) => {
    const provided = req.get(ADMIN_SHIELD_HEADER);
    if (!provided || !ADMIN_SHIELD_SECRET || !timingSafeEquals(provided, ADMIN_SHIELD_SECRET)) {
        appendAuditLog(req, 'ADMIN_SHIELD_REJECTED', 'unknown', 'failed');
        return fakeNotFound(res);
    }
    return next();
};

const auditAdminMutation = (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

    res.on('finish', () => {
        appendAuditLog(
            req,
            `ADMIN_DATA_${req.method}`,
            req.actor?.email || req.session?.email || req.body?.userEmail || req.body?.updatedBy || req.body?.createdBy || req.body?.deletedBy || 'unknown',
            res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failed',
            {
                statusCode: res.statusCode,
                entityId: req.params?.id || req.body?.hotelId || req.body?.mitraId || req.body?.customerId || req.body?.assistantId || req.body?.bodhiPathId || req.body?.entityId || null
            }
        );
    });

    return next();
};

app.get([
    '/admin',
    '/admin/',
    '/admin.html',
    '/admin-fixed.html',
    '/admin-secret-panel.html',
    '/admin-control.html'
], (req, res) => fakeNotFound(res));

app.use('/api/admin', requireAdminShield);
app.use('/api/admin', auditAdminMutation);
app.use('/admin-login', requireAdminShield);
app.use('/admin/login', requireAdminShield);
app.use('/api/admin-login', requireAdminShield);
app.use('/api/admin/login', requireAdminShield);
app.use('/admin', requireAdminShield);
app.use('/admin', auditAdminMutation);

const parseDurationMs = (value, fallbackMs = SESSION_TTL_MS) => {
    const match = String(value || '').trim().match(/^(\d+)(ms|s|m|h|d)?$/i);
    if (!match) return fallbackMs;
    const amount = Number(match[1]);
    const unit = (match[2] || 'ms').toLowerCase();
    const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return amount * (multipliers[unit] || 1);
};

const signJwt = (payload, expiresIn = '8h') => {
    const secret = getSessionSecret();
    if (!secret) throw new Error('JWT_SECRET or SESSION_SECRET is required for signed sessions');

    const now = Math.floor(Date.now() / 1000);
    const ttlMs = parseDurationMs(expiresIn, SESSION_TTL_MS);
    const header = encodeTokenPart({ alg: 'HS256', typ: 'JWT' });
    const body = encodeTokenPart({
        ...payload,
        iat: now,
        exp: Math.floor((Date.now() + ttlMs) / 1000)
    });
    const signingInput = `${header}.${body}`;
    const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
    return `${signingInput}.${signature}`;
};

const verifyJwtToken = (token) => {
    const [header, body, signature] = String(token || '').split('.');
    if (!header || !body || !signature) return null;

    const expected = crypto.createHmac('sha256', getSessionSecret()).update(`${header}.${body}`).digest('base64url');
    if (!timingSafeEquals(signature, expected)) return null;

    const decodedHeader = decodeTokenPart(header);
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;

    const payload = decodeTokenPart(body);
    if (!payload.email || !payload.role || !payload.exp || payload.exp * 1000 < Date.now()) return null;
    payload.enterpriseRole = payload.enterpriseRole || normalizeEnterpriseRole(payload.role);
    return payload;
};

const ensureVerifiedSession = (req) => {
    const session = verifySessionToken(readSessionToken(req));
    if (session) req.session = session;
    return session;
};

const requireSession = (allowedRoles = []) => (req, res, next) => {

    const session = ensureVerifiedSession(req);

    if (!session) {

        return res.status(401).json({ success: false, message: 'Authentication required', code: 'SESSION_REQUIRED' });

    }

    if (allowedRoles.length && !allowedRoles.includes(session.role)) {

        return res.status(403).json({ success: false, message: 'Permission denied for this role', code: 'ROLE_FORBIDDEN' });

    }

    req.session = session;

    next();

};



io.use((socket, next) => {

    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    const session = verifySessionToken(token);

    if (!session || !['admin', 'assistant'].includes(session.enterpriseRole)) {

        return next(new Error('Admin or assistant socket authentication required'));

    }

    socket.session = session;

    next();

});



io.on('connection', (socket) => {

    socket.join('staff');

    socket.join(socket.session.enterpriseRole);

    socket.emit('connected', {

        success: true,

        role: socket.session.enterpriseRole,

        timestamp: new Date().toISOString()

    });

});



const emitRealtime = (type, payload = {}) => {

    const event = { type, payload, timestamp: new Date().toISOString() };

    io.to('staff').emit(type, event);

    io.to('staff').emit('dashboard-sync', event);

    const message = `event: update\ndata: ${JSON.stringify(event)}\n\n`;

    realtimeClients.forEach((client) => client.write(message));

};

const createSystemNotification = async ({ title, message, type = 'system', entityType = '', entityId = null, audience = ['admin', 'assistant'], createdBy = 'system' } = {}) => {

    try {

        if (!title || !message) return null;

        const uniqueAudience = [...new Set((Array.isArray(audience) ? audience : [audience]).filter(Boolean))];

        const notification = await SystemNotification.create({ title, message, type, entityType, entityId, audience: uniqueAudience, createdBy });

        emitRealtime('system-notification', { notification });

        return notification;

    } catch (err) {

        console.error('System notification error:', err.message);

        return null;

    }

};



// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ROLE-BASED ACCESS CONTROL MIDDLEWARE

const checkRole = (allowedRoles) => {

    return async (req, res, next) => {

        try {

            const { userEmail, userRole } = req.body;



            if (!userEmail || !userRole) {

                return res.status(400).json({ success: false, message: 'User identity required' });

            }



            // Check if user is admin

            if (userRole === 'admin' && userEmail === ADMIN_EMAIL) {

                if (allowedRoles.includes('admin')) {

                    return next();

                }

            }



            // Check if user is assistant

            if (userRole === 'assistant') {

                const assistant = await Assistant.findOne({ email: userEmail, isActive: true });

                if (assistant && allowedRoles.includes('assistant')) {

                    return next();

                }

            }



            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        } catch (err) {

            return res.status(500).json({ success: false, message: err.message });

        }

    };

};



const getRequestActor = async (req) => {

    const email = normalizeEmail(

        req.session?.email ||

        req.body?.userEmail ||

        req.body?.updatedBy ||

        req.body?.createdBy ||

        req.body?.deletedBy ||

        req.query?.userEmail

    );

    const requestedRole =

        req.session?.enterpriseRole ||

        normalizeEnterpriseRole(req.session?.role || req.body?.userRole || req.body?.updatedByRole || req.body?.createdByRole || req.body?.deletedByRole || req.query?.userRole);



    if (!email) return null;

    if (requestedRole === 'admin') {

        const admin = await User.findOne({ email, role: 'admin', isLocked: { $ne: true } }).select('email role');

        if (admin) {

            return { email: admin.email, role: 'admin', permissions: {} };

        }

    }

    if (requestedRole === 'assistant') {

        const assistant = await Assistant.findOne({ email, isActive: true }).select('email role permissions');

        if (assistant) {

            return { email: assistant.email, role: 'assistant', permissions: normalizeAssistantPermissions(assistant.permissions || {}) };

        }

    }

    if (STAFF_ROLES.includes(requestedRole)) {

        const staff = await User.findOne({ email, role: requestedRole, isLocked: { $ne: true } }).select('email role supportTier');

        if (staff) {

            return { email: staff.email, role: staff.role, permissions: {}, supportTier: staff.supportTier || 'tier1' };

        }

    }

    return null;

};



const verifyAdmin = async (req, res, next) => {

    try {

        const session = ensureVerifiedSession(req);

        if (!session || session.role !== 'admin') {

            return res.status(403).json({ success: false, message: 'Admin access required' });

        }

        const actor = await getRequestActor(req);

        if (!actor || actor.role !== 'admin') {

            return res.status(403).json({ success: false, message: 'Admin access required' });

        }

        req.actor = actor;

        return next();

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifyAssistant = (permission = null) => async (req, res, next) => {

    try {

        const session = ensureVerifiedSession(req);

        if (!session || session.role !== 'assistant') {

            return res.status(403).json({ success: false, message: 'Assistant access required' });

        }

        const actor = await getRequestActor(req);

        if (!actor || actor.role !== 'assistant') {

            return res.status(403).json({ success: false, message: 'Assistant access required' });

        }

        if (!assistantHasPermission(actor.permissions, permission)) {

            return res.status(403).json({ success: false, message: `Assistant permission required: ${permission}` });

        }

        req.actor = actor;

        return next();

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifyAssistantToken = (permission = null) => verifyAssistant(permission);

app.get('/api/assistants/uploads/:filename', verifyAssistantToken('manageHotels'), (req, res) => {
    const rawName = String(req.params.filename || '').trim();
    let decodedName = '';

    try {
        decodedName = decodeURIComponent(rawName);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid file name' });
    }

    decodedName = decodedName
        .replace(/\0/g, '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/^uploads\//i, '');

    const safeFileName = path.basename(decodedName);
    if (!safeFileName || safeFileName === '.' || safeFileName === '..' || safeFileName.includes('..')) {
        return res.status(400).json({ success: false, message: 'Invalid file name' });
    }

    const filePath = path.resolve(uploadsDir, safeFileName);
    if (!filePath.startsWith(path.resolve(uploadsDir) + path.sep)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!safePathExists(filePath)) {
        console.error(`[Uploads Route Error] File requested: ${safeFileName}, Checked path: ${filePath}`);
        return res.status(404).json({ success: false, message: 'File not found on server storage' });
    }

    const ext = path.extname(safeFileName).toLowerCase();
    const contentTypes = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
    };

    res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (contentTypes[ext]) res.setHeader('Content-Type', contentTypes[ext]);
    return res.sendFile(filePath);
});

const verifyAdminOrAssistant = (permission = null) => async (req, res, next) => {

    try {

        // Populate session from token if present so owners with valid tokens get recognized
        const session = ensureVerifiedSession(req);

        // Allow hotel owners (role 'hotel') to proceed when they present a valid session token
        if (session && session.role === 'hotel') {
            req.actor = { email: req.session.email, role: 'hotel' };
            return next();
        }

        if (!session) {

            return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'SESSION_REQUIRED' });

        }

        if (!['admin', 'assistant'].includes(session.role)) {

            return res.status(403).json({ success: false, message: 'Admin or assistant access required', code: 'ROLE_FORBIDDEN' });

        }

        const actor = await getRequestActor(req);

        if (!actor) return res.status(403).json({ success: false, message: 'Admin or assistant access required' });

        if (actor.role === 'admin') {

            req.actor = actor;

            return next();

        }

        if (actor.role === 'assistant' && assistantHasPermission(actor.permissions, permission)) {

            req.actor = actor;

            return next();

        }

        return res.status(403).json({ success: false, message: permission ? `Assistant permission required: ${permission}` : 'Unauthorized access' });

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifySiteSettingsActor = async (req, res, next) => {

    try {

        const session = ensureVerifiedSession(req);

        if (!session || !['admin', 'assistant'].includes(session.role)) {

            return res.status(403).json({ success: false, message: 'Session expired or permission required. Please log in again.', data: null });

        }

        const actor = await getRequestActor(req);

        if (!actor || !['admin', 'assistant'].includes(actor.role)) {

            return res.status(403).json({ success: false, message: 'Session expired or permission required. Please log in again.', data: null });

        }

        req.actor = actor;

        return next();

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message, data: null });

    }

};



const verifySupportActor = (allowedRoles = ['support', 'specialist', 'assistant', 'admin']) => async (req, res, next) => {

    try {

        const session = ensureVerifiedSession(req);

        if (!session || !allowedRoles.includes(session.role)) {

            return res.status(403).json({ success: false, message: 'Support access required' });

        }

        const actor = await getRequestActor(req);

        if (!actor || !allowedRoles.includes(actor.role)) {

            return res.status(403).json({ success: false, message: 'Support access required' });

        }

        req.actor = actor;

        return next();

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifyProfileUploadActor = (permission = null) => async (req, res, next) => {

    const session = ensureVerifiedSession(req);

    if (session) {

        req.session = session;

        return next();

    }



    return verifyAdminOrAssistant(permission)(req, res, next);

};



// Helper function to log activities

const logActivity = async (actionType, entityType, entityId, entityName, performedBy, performedByRole, changes = null) => {

    try {

        const activity = new ActivityLog({

            actionType,

            entityType,

            entityId,

            entityName,

            performedBy,

            performedByRole,

            changes

        });

        await activity.save();

        emitRealtime('activity', { actionType, entityType, entityId, entityName });

    } catch (err) {

        console.error('Activity log error:', err);

    }

};



const logSecurityEvent = async (eventType, entityName, performedBy, performedByRole, details = null) => {

    try {

        const activity = new ActivityLog({

            actionType: 'SECURITY',

            entityType: 'Security',

            entityName,

            performedBy,

            performedByRole,

            changes: details ? { eventType, details } : { eventType }

        });

        await activity.save();

    } catch (err) {

        console.error('Security log error:', err);

    }

};



const isValidSortArg = (sortArg) => {

    return sortArg && typeof sortArg === 'object' && !Array.isArray(sortArg) && Object.keys(sortArg).length > 0;

};



const safeSortQuery = (query, sortArg) => {

    return isValidSortArg(sortArg) ? query.sort(sortArg) : query;

};



const verifyAdminOnly = (email, role) => role === 'admin' && shouldTreatAsAdmin(email);

const normalizeAssistantPermissions = (permissions = {}) => {

    const normalized = {
        manageHotels: permissions.manageHotels === true,
        manageCustomers: permissions.manageCustomers === true,
        manageMitra: permissions.manageMitra === true || permissions.manageMitras === true,
        manageMitras: permissions.manageMitras === true || permissions.manageMitra === true,
        manageBookings: permissions.manageBookings === true,
        viewReports: permissions.viewReports === true,
        manageHeritage: permissions.manageHeritage === true,
        manageSettings: permissions.manageSettings !== false
    };

    return normalized;

};

const assistantHasPermission = (permissions = {}, permission = null) => {

    if (!permission) return true;

    const normalized = normalizeAssistantPermissions(permissions);

    if (permission === 'manageMitra' || permission === 'manageMitras') {
        return normalized.manageMitra === true || normalized.manageMitras === true;
    }

    return normalized[permission] === true;

};

const DEFAULT_SITE_SETTINGS = {
    key: 'global',
    activeTheme: 'spiritual-gold',
    heroLayout: 'centered',
    heroBanners: [{
        sectionId: 'home',
        title: 'Discover Bodhgaya Stays',
        subtitle: 'Verified hotels, trusted rooms, and peaceful stays for your Bodhgaya trip',
        imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070',
        badgeText: 'Verified Heritage Stays',
        ctaLink: 'hotel.html',
        active: true
    }],
    loginBanners: [{
        title: 'Book Bodhgaya journeys with calm confidence.',
        subtitle: 'Hotels, temple circuits, airport rides, and Bodhi Path experiences in one trusted travel account.',
        imageUrl: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1600&q=80',
        badgeText: 'Verified stays and sacred routes',
        active: true
    }],
    customColors: { primary: '#ff6b00', accent: '#f59e0b' },
    bodhiVisuals: { cardRadius: 18, badgeColor: '#d6a843', goldAccent: '#f6d784', bannerCaption: 'Heritage & Spiritual Tour Exploration First' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter' },
    navbar: { brandText: 'Gyan Garbh', logoUrl: '' },
    announcementBar: { text: 'Get 15% OFF on Bodhi Path Heritage Tours', link: 'hotel.html', active: true },
    searchOverlay: {
        destinationPlaceholder: 'Search Bodhgaya hotels or temple routes',
        checkInLabel: 'Check-in',
        checkOutLabel: 'Check-out',
        guestsLabel: 'Pilgrims',
        buttonText: 'Search'
    },
    footer: {
        copyrightText: '? 2026 Gyan Garbh. All rights reserved.',
        socialLinks: [
            { label: 'Instagram', url: '#', icon: 'bi-instagram' },
            { label: 'Facebook', url: '#', icon: 'bi-facebook' }
        ]
    },
    uploadedAssets: []
};

const allowedThemeIds = new Set(['spiritual-gold', 'modern-blue', 'agoda-clean', 'minimal-dark', 'heritage-vibe']);

const cleanImageUrl = (value = '') => {
    const url = String(value || '').trim();
    return /^data:image\//i.test(url) ? '' : url.slice(0, 1000);
};

const cleanBanner = (banner = {}, fallbackSection = 'home') => ({
    sectionId: String(banner.sectionId || fallbackSection).trim() || fallbackSection,
    title: String(banner.title || '').trim(),
    subtitle: String(banner.subtitle || '').trim(),
    imageUrl: cleanImageUrl(banner.imageUrl),
    badgeText: String(banner.badgeText || '').trim(),
    ctaLink: String(banner.ctaLink || '').trim(),
    active: banner.active !== false
});

const cleanLoginBanner = (banner = {}) => ({
    title: String(banner.title || '').trim(),
    subtitle: String(banner.subtitle || '').trim(),
    imageUrl: String(banner.imageUrl || '').trim(),
    badgeText: String(banner.badgeText || '').trim(),
    active: banner.active !== false
});

const cleanShortText = (value, fallback = '', max = 120) => String(value || fallback || '').trim().slice(0, max);

const cleanBodhiVisuals = (visuals = {}) => {
    const radius = Number(visuals.cardRadius);
    const color = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
    return {
        cardRadius: Number.isFinite(radius) ? Math.min(28, Math.max(8, radius)) : DEFAULT_SITE_SETTINGS.bodhiVisuals.cardRadius,
        badgeColor: color(visuals.badgeColor, DEFAULT_SITE_SETTINGS.bodhiVisuals.badgeColor),
        goldAccent: color(visuals.goldAccent, DEFAULT_SITE_SETTINGS.bodhiVisuals.goldAccent),
        bannerCaption: cleanShortText(visuals.bannerCaption, DEFAULT_SITE_SETTINGS.bodhiVisuals.bannerCaption, 120)
    };
};

const cleanUploadedAsset = (asset = {}) => ({
    imageUrl: cleanImageUrl(asset.imageUrl),
    publicId: cleanShortText(asset.publicId, '', 160),
    sectionId: cleanShortText(asset.sectionId, 'home', 60),
    label: cleanShortText(asset.label, asset.sectionId || 'Site Asset', 100),
    uploadedBy: cleanShortText(asset.uploadedBy, 'system', 120),
    uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt) : new Date()
});

const normalizeSiteSettingsPayload = (body = {}) => ({
    activeTheme: allowedThemeIds.has(body.activeTheme) ? body.activeTheme : DEFAULT_SITE_SETTINGS.activeTheme,
    heroLayout: ['centered', 'split', 'search-first'].includes(body.heroLayout) ? body.heroLayout : 'centered',
    heroBanners: (Array.isArray(body.heroBanners) ? body.heroBanners : DEFAULT_SITE_SETTINGS.heroBanners).slice(0, 12).map((banner) => cleanBanner(banner, 'home')),
    loginBanners: (Array.isArray(body.loginBanners) ? body.loginBanners : DEFAULT_SITE_SETTINGS.loginBanners).slice(0, 8).map(cleanLoginBanner).filter((banner) => banner.imageUrl),
    customColors: {
        primary: /^#[0-9a-f]{6}$/i.test(String(body.customColors?.primary || '')) ? body.customColors.primary : DEFAULT_SITE_SETTINGS.customColors.primary,
        accent: /^#[0-9a-f]{6}$/i.test(String(body.customColors?.accent || '')) ? body.customColors.accent : DEFAULT_SITE_SETTINGS.customColors.accent
    },
    typography: {
        headingFont: String(body.typography?.headingFont || 'Inter').trim().slice(0, 40) || 'Inter',
        bodyFont: String(body.typography?.bodyFont || 'Inter').trim().slice(0, 40) || 'Inter'
    },
    bodhiVisuals: cleanBodhiVisuals(body.bodhiVisuals),
    navbar: {
        brandText: cleanShortText(body.navbar?.brandText, DEFAULT_SITE_SETTINGS.navbar.brandText, 80),
        logoUrl: cleanImageUrl(body.navbar?.logoUrl)
    },
    announcementBar: {
        text: cleanShortText(body.announcementBar?.text, DEFAULT_SITE_SETTINGS.announcementBar.text, 160),
        link: cleanShortText(body.announcementBar?.link, DEFAULT_SITE_SETTINGS.announcementBar.link, 300),
        active: body.announcementBar?.active !== false
    },
    searchOverlay: {
        destinationPlaceholder: cleanShortText(body.searchOverlay?.destinationPlaceholder, DEFAULT_SITE_SETTINGS.searchOverlay.destinationPlaceholder, 120),
        checkInLabel: cleanShortText(body.searchOverlay?.checkInLabel, DEFAULT_SITE_SETTINGS.searchOverlay.checkInLabel, 40),
        checkOutLabel: cleanShortText(body.searchOverlay?.checkOutLabel, DEFAULT_SITE_SETTINGS.searchOverlay.checkOutLabel, 40),
        guestsLabel: cleanShortText(body.searchOverlay?.guestsLabel, DEFAULT_SITE_SETTINGS.searchOverlay.guestsLabel, 40),
        buttonText: cleanShortText(body.searchOverlay?.buttonText, DEFAULT_SITE_SETTINGS.searchOverlay.buttonText, 40)
    },
    footer: {
        copyrightText: cleanShortText(body.footer?.copyrightText, DEFAULT_SITE_SETTINGS.footer.copyrightText, 180),
        socialLinks: (Array.isArray(body.footer?.socialLinks) ? body.footer.socialLinks : DEFAULT_SITE_SETTINGS.footer.socialLinks)
            .slice(0, 6)
            .map((link) => ({
                label: cleanShortText(link.label, '', 40),
                url: cleanShortText(link.url, '', 300),
                icon: cleanShortText(link.icon, 'bi-link-45deg', 40)
            }))
            .filter((link) => link.label || link.url)
    },
    uploadedAssets: (Array.isArray(body.uploadedAssets) ? body.uploadedAssets : [])
        .map(cleanUploadedAsset)
        .filter((asset) => asset.imageUrl)
        .slice(0, 60)
});

const getSiteSettings = async () => {
    const existing = await SiteSettings.findOne({ key: 'global' });
    if (existing) return existing;
    return SiteSettings.create(DEFAULT_SITE_SETTINGS);
};



const slugify = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/(^-|-$)/g, '') || 'hotel';

const generateDefaultHotelEmail = (hotelName) => `${slugify(hotelName)}${Math.floor(100 + Math.random() * 900)}@gyangarbh.com`;

const generateDefaultPassword = () => `Gyan@${Math.random().toString(36).slice(2,10)}${Math.floor(10 + Math.random() * 89)}`;



const resolveActorRole = async (email, requestedRole) => {

    if (email === ADMIN_EMAIL && (!requestedRole || requestedRole === 'admin')) return 'admin';

    if ((!requestedRole || requestedRole === 'assistant') && await Assistant.exists({ email, isActive: true })) return 'assistant';

    return null;

};





const verifyHeritageManager = async (req, res, next) => {
    try {
        const session = ensureVerifiedSession(req);
        if (!session || !['admin', 'assistant', 'mitra'].includes(session.role)) {
            return res.status(403).json({ success: false, message: 'Admin, Assistant, or Mitra access required' });
        }

        if (session.role === 'mitra') {
            const mitra = await User.findOne({ email: normalizeEmail(session.email), role: 'mitra', isLocked: { $ne: true } }).select('email role name fullName');
            if (!mitra) return res.status(403).json({ success: false, message: 'Active Mitra access required' });
            req.actor = { email: mitra.email, role: 'mitra', name: mitra.fullName || mitra.name || mitra.email };
            return next();
        }

        const actor = await getRequestActor(req);
        if (!actor) return res.status(403).json({ success: false, message: 'Heritage manager access required' });
        if (actor.role === 'admin' || (actor.role === 'assistant' && assistantHasPermission(actor.permissions, 'manageHeritage'))) {
            req.actor = await enrichHeritageActor(actor);
            return next();
        }

        return res.status(403).json({ success: false, message: 'Assistant permission required: manageHeritage' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const toCleanArray = (value) => Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : String(value || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);

const buildHeritagePayload = (body = {}) => {
    const routeDetails = body.routeDetails || {};
    const title = String(body.name || body.title || '').trim();
    const category = String(body.category || body.type || 'temple').trim().toLowerCase().replace(/\s+/g, '-');
    const safeCategory = ['temple', 'monastery', 'circuit-route', 'sacred-tree', 'history', 'monument', 'festival', 'tradition'].includes(category) ? category : 'temple';
    const galleryImages = toCleanArray(body.galleryImages || body.images);
    const coverImage = String(body.coverImage || body.imageUrl || galleryImages[0] || '').trim();
    const bestTime = String(routeDetails.bestTimeToVisit || body.bestTimeToVisit || '').trim();
    const openingHours = String(body.openingHours || body.visitingHours || '').trim();

    return {
        name: title,
        title,
        type: body.type || safeCategory.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
        category: safeCategory,
        tagline: String(body.tagline || body.shortTagline || body.shortDescription || '').trim(),
        shortDescription: String(body.shortDescription || body.tagline || body.shortTagline || title).trim(),
        fullDescription: String(body.fullDescription || body.richDescription || body.description || body.shortDescription || title).trim(),
        significance: body.significance || '',
        historicalFacts: toCleanArray(body.historicalFacts),
        location: body.location || {},
        imageUrl: coverImage,
        coverImage,
        images: galleryImages,
        galleryImages,
        routeDetails: {
            startingPoint: String(routeDetails.startingPoint || body.startingPoint || '').trim(),
            keyStops: toCleanArray(routeDetails.keyStops || body.keyStops || body.relatedTemples),
            estimatedDuration: String(routeDetails.estimatedDuration || body.estimatedDuration || body.estimatedVisitTime || '').trim(),
            estimatedKm: String(routeDetails.estimatedKm || body.estimatedKm || body.estimatedDistanceKm || '').trim(),
            bestTimeToVisit: bestTime
        },
        bestTimeToVisit: bestTime,
        visitingHours: openingHours,
        openingHours,
        entryFee: String(body.entryFee || '').trim(),
        estimatedVisitTime: String(body.estimatedVisitTime || routeDetails.estimatedDuration || body.estimatedDuration || '').trim(),
        relatedTemples: toCleanArray(body.relatedTemples || routeDetails.keyStops || body.keyStops),
        spiritualSignificance: body.spiritualSignificance || '',
        status: body.status === 'Inactive' || body.isLocked === true ? 'Inactive' : 'Active',
        isLocked: body.status === 'Inactive' || body.isLocked === true
    };
};

const DEFAULT_BODHI_PATH_SITES = [
    {
        title: 'Mahabodhi Temple Complex',
        name: 'Mahabodhi Temple Complex',
        type: 'Temple',
        category: 'temple',
        tagline: 'UNESCO World Heritage sacred temple',
        shortDescription: 'The enlightenment shrine and most important pilgrimage landmark in Bodh Gaya.',
        fullDescription: 'The Mahabodhi Temple marks the sacred place where Siddhartha Gautama attained enlightenment. It is the natural first stop for pilgrims and the anchor for nearby verified stays.',
        significance: 'The holiest Buddhist pilgrimage site in Bodh Gaya.',
        location: { address: 'Bodhi Marg, Bodh Gaya, Bihar 824231' },
        imageUrl: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=1200&auto=format&fit=crop',
        coverImage: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=1200&auto=format&fit=crop',
        visitingHours: '5:00 AM - 9:00 PM',
        openingHours: '5:00 AM - 9:00 PM',
        entryFee: 'Free',
        estimatedVisitTime: '2-3 hours',
        routeDetails: { startingPoint: 'Bodh Gaya Town', keyStops: ['Bodhi Tree Sacred Site', 'Temple Main Altar', 'Museum'], estimatedDuration: '2-3 hours', estimatedKm: '0.5 km' },
        relatedTemples: ['Bodhi Tree Sacred Site', 'Thai Monastery', 'Japanese Temple Circuit'],
        bestTimeToVisit: 'October to March',
        status: 'Active'
    },
    {
        title: 'Thai Monastery', name: 'Thai Monastery', type: 'Monastery', category: 'monastery', tagline: 'Peaceful Thai Buddhist monastery near the main circuit', shortDescription: 'A calm monastery known for Thai architecture, meditation atmosphere, and easy access from central Bodhgaya.', fullDescription: 'Thai Monastery brings a graceful international Buddhist presence to Bodh Gaya and is a favorite stop for slow, quiet exploration after the Mahabodhi Temple.', significance: 'A living monastery representing Thai Buddhist devotion in Bodh Gaya.', location: { address: 'Near Mahabodhi Temple, Bodh Gaya' }, imageUrl: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=80', coverImage: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=80', visitingHours: '6:00 AM - 7:00 PM', openingHours: '6:00 AM - 7:00 PM', entryFee: 'Free', estimatedVisitTime: '1-2 hours', routeDetails: { startingPoint: 'Thai Monastery Main Gate', keyStops: ['Prayer Hall', 'Meditation Gardens', 'Monks Quarters'], estimatedDuration: '1-2 hours', estimatedKm: '0.3 km' }, relatedTemples: ['Royal Bhutan Monastery', 'Japanese Temple Circuit'], bestTimeToVisit: 'Morning and sunset', status: 'Active'
    },
    {
        title: 'Great Buddha Statue', name: 'Great Buddha Statue', type: 'Monument', category: 'monument', tagline: 'Iconic open-air Buddha monument', shortDescription: 'A landmark Buddha statue suited for families, first-time visitors, and evening route planning.', fullDescription: "The Great Buddha Statue is one of Bodh Gaya's most recognizable landmarks and pairs naturally with nearby monasteries, cafes, and family-friendly stays.", significance: 'A modern symbol of peace, compassion, and Buddhist devotion.', location: { address: 'Bodh Gaya, Bihar' }, imageUrl: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80', coverImage: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80', visitingHours: '6:00 AM - 6:00 PM', openingHours: '6:00 AM - 6:00 PM', entryFee: 'Free', estimatedVisitTime: '1 hour', routeDetails: { startingPoint: 'Great Buddha Statue Base', keyStops: ['Meditation Platform', 'Viewpoint'], estimatedDuration: '1 hour', estimatedKm: '1 km' }, relatedTemples: ['Thai Monastery', 'Royal Bhutan Monastery'], bestTimeToVisit: 'Late afternoon', status: 'Active'
    },
    {
        title: 'Royal Bhutan Monastery', name: 'Royal Bhutan Monastery', type: 'Monastery', category: 'monastery', tagline: 'Bhutanese spiritual sanctuary', shortDescription: 'An ornate Bhutanese monastery featuring vibrant traditional architecture and authentic Buddhist practices.', fullDescription: 'Royal Bhutan Monastery adds a vivid Bhutanese presence to the Bodh Gaya circuit with prayer halls, detailed murals, and a peaceful stop for reflective visitors.', significance: 'A living expression of Bhutanese Buddhist devotion in Bodh Gaya.', location: { address: 'Bodh Gaya, Bihar' }, imageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&auto=format&fit=crop', coverImage: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&auto=format&fit=crop', visitingHours: '6:00 AM - 9:00 PM', openingHours: '6:00 AM - 9:00 PM', entryFee: 'Free', estimatedVisitTime: '1.5-2 hours', routeDetails: { startingPoint: 'Royal Bhutan Monastery Gate', keyStops: ['Main Temple', 'Prayer Wheels', 'Monastery Garden'], estimatedDuration: '1.5-2 hours', estimatedKm: '0.8 km' }, relatedTemples: ['Thai Monastery', 'Japanese Temple Circuit'], bestTimeToVisit: 'Morning and sunset', status: 'Active'
    },
    {
        title: 'Japanese Temple Circuit', name: 'Japanese Temple Circuit', type: 'Route', category: 'circuit-route', tagline: 'Japanese Buddhism heritage route', shortDescription: 'A curated pilgrimage route connecting Japanese Buddhist temple experiences in Bodh Gaya.', fullDescription: 'The Japanese Temple Circuit is designed for travelers who want a calm multi-stop path through Japanese Buddhist architecture, meditation spaces, and nearby heritage landmarks.', significance: 'A route highlighting international Buddhist heritage around Bodh Gaya.', location: { address: 'Bodh Gaya temple circuit, Bihar' }, imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c6f2b0991?w=1200&auto=format&fit=crop', coverImage: 'https://images.unsplash.com/photo-1517604931442-7e0c6f2b0991?w=1200&auto=format&fit=crop', visitingHours: '7:00 AM - 6:00 PM', openingHours: '7:00 AM - 6:00 PM', entryFee: 'Free', estimatedVisitTime: '3-4 hours', routeDetails: { startingPoint: 'Mahabodhi Temple Complex', keyStops: ['Japanese Temple', 'Zen Gardens', 'Meditation Center', 'Temple Library'], estimatedDuration: '3-4 hours', estimatedKm: '2.5 km' }, relatedTemples: ['Thai Monastery', 'Royal Bhutan Monastery'], bestTimeToVisit: 'October to March', status: 'Active'
    },
    {
        title: 'Bodhi Tree Sacred Site', name: 'Bodhi Tree Sacred Site', type: 'Sacred Tree', category: 'sacred-tree', tagline: 'The tree of enlightenment', shortDescription: 'The sacred fig tree under which Buddha attained enlightenment 2,600 years ago.', fullDescription: 'The Bodhi Tree Sacred Site is one of the most revered places in the Mahabodhi Temple area, inviting pilgrims to pause at the symbolic heart of the enlightenment story.', significance: 'The living symbol of awakening and Buddhist pilgrimage.', location: { address: 'Inside Mahabodhi Temple Complex, Bodh Gaya' }, imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&auto=format&fit=crop', coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&auto=format&fit=crop', visitingHours: '5:00 AM - 9:00 PM', openingHours: '5:00 AM - 9:00 PM', entryFee: 'Free', estimatedVisitTime: '1-2 hours', routeDetails: { startingPoint: 'Mahabodhi Temple Complex', keyStops: ['Meditation Platform', 'Vajrasana', 'Prayer Walk'], estimatedDuration: '1-2 hours', estimatedKm: '0.1 km' }, relatedTemples: ['Mahabodhi Temple Complex', 'Thai Monastery'], bestTimeToVisit: 'Early morning', status: 'Active'
    }
];

const ensureDefaultBodhiPathData = async () => {
    const existingCount = await BodhiPath.countDocuments();
    if (existingCount > 0) return false;
    await BodhiPath.insertMany(DEFAULT_BODHI_PATH_SITES.map((site) => ({
        ...site,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'system',
        auditLogs: [{ updatedBy: 'System', role: 'system', action: 'SEEDED', timestamp: new Date(), changes: 'Default heritage-first sacred site seed' }]
    })));
    return true;
};

const heritageAudit = (actor, action, changes) => ({
    updatedBy: actor?.name || actor?.email || 'System',
    role: actor?.role || 'system',
    action,
    timestamp: new Date(),
    changes: typeof changes === 'string' ? changes : JSON.stringify(changes || {})
});

const enrichHeritageActor = async (actor = {}) => {
    if (!actor.email) return actor;
    if (actor.name) return actor;
    if (actor.role === 'assistant') {
        const assistant = await Assistant.findOne({ email: normalizeEmail(actor.email) }).select('name email');
        return { ...actor, name: assistant?.name || actor.email };
    }
    if (actor.role === 'mitra') {
        const mitra = await User.findOne({ email: normalizeEmail(actor.email), role: 'mitra' }).select('name fullName email');
        return { ...actor, name: mitra?.fullName || mitra?.name || actor.email };
    }
    return { ...actor, name: actor.role === 'admin' ? 'Admin' : actor.email };
};
const sendBookingCancellationAlert = async (booking, reason) => {

    // Placeholder: replace with WhatsApp and email provider calls.

    console.info(`[MOCK ALERT] WhatsApp/Email to hotel owner: booking ${booking._id} at ${booking.hotelName} was cancelled. Reason: ${reason}`);

};



const getFourPmReleaseTime = (checkIn) => {

    const dateMatch = String(checkIn || '').match(/^\d{4}-\d{2}-\d{2}/);

    const releaseTime = dateMatch

        ? new Date(`${dateMatch[0]}T16:00:00`)

        : new Date(checkIn);



    if (Number.isNaN(releaseTime.getTime())) return null;

    releaseTime.setHours(16, 0, 0, 0);

    return releaseTime;

};



const autoReleaseBookings = async (now = new Date()) => {

    const candidates = await Booking.find({

        checkedIn: { $ne: true },

        status: { $ne: 'Cancelled' },

        $or: [

            { paymentStatus: 'Pay at Hotel' },

            { status: 'Pending' }

        ]

    });



    const releasedBookings = [];

    for (const booking of candidates) {

        const releaseTime = getFourPmReleaseTime(booking.checkIn);

        if (!releaseTime || now < releaseTime) continue;



        const releasedBooking = await Booking.findOneAndUpdate(

            { _id: booking._id, checkedIn: { $ne: true }, status: { $ne: 'Cancelled' } },

            {

                status: 'Cancelled',

                cancellationReason: 'Auto-released after 4:00 PM no-show cutoff',

                cancelledAt: now,

                autoReleased: true

            },

            { new: true }

        );



        if (releasedBooking) {

            releasedBookings.push(releasedBooking);

            await sendBookingCancellationAlert(releasedBooking, releasedBooking.cancellationReason);

            emitRealtime('booking-cancelled', { bookingId: releasedBooking._id, hotelName: releasedBooking.hotelName });

        }

    }



    return releasedBookings;

};



app.all('/api/admin', async (req, res) => {

    const ipAddress = String(req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown')

        .split(',')[0]

        .trim();



    await logActivity(

        'CRITICAL_ATTACK',

        'Security',

        null,

        '/api/admin honeypot',

        `unauthenticated:${ipAddress}`,

        'system',

        { ipAddress, method: req.method, userAgent: req.get('user-agent') || 'unknown' }

    );



    setTimeout(() => {

        res.status(404).json({ success: false, message: 'Admin service unavailable' });

    }, 3000);

});



let otpStore = {};

let pendingRegistrationStore = {};
let progressiveAuthStore = {};

let resetAuthorizationStore = {};



app.get('/api/events', requireSession(), (req, res) => {

    res.set({

        'Content-Type': 'text/event-stream',

        'Cache-Control': 'no-cache, no-transform',

        Connection: 'keep-alive'

    });

    res.flushHeaders();

    res.write(`event: connected\ndata: ${JSON.stringify({ success: true })}\n\n`);

    realtimeClients.add(res);

    req.on('close', () => realtimeClients.delete(res));

});



function hotelTrackingBaseUrl() {
    // Priority: Environment variables > Current deployment domain
    // For Vercel: Frontend and Backend share the same domain, so empty string uses relative paths
    const configured = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || process.env.APP_URL;
    if (configured) return String(configured).replace(/\/$/, '');
    
    // For local development or when env vars aren't set, return relative path (will resolve to same domain)
    return '';
}

async function createUniqueHotelRequestId() {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const suffix = String(Math.floor(1000 + Math.random() * 9000));
        const requestId = `GG-REQ-${year}-${suffix}`;
        const exists = await Hotel.exists({ applicationRequestId: requestId });
        if (!exists) return requestId;
    }
    return `GG-REQ-${year}-${Date.now().toString().slice(-6)}`;
}

async function sendHotelApplicationConfirmationEmail({ to, hotelName, requestId, trackingLink, brevoApiKey }) {
    if (!SMTP_USER || !brevoApiKey) {
        const error = new Error('Brevo API credentials are missing.');
        error.code = 'BREVO_CONFIG_MISSING';
        throw error;
    }
    const safeHotelName = String(hotelName || 'Partner Hotel');
    const payload = {
        sender: { name: 'Gyan Garbh', email: SMTP_USER },
        to: [{ email: to }],
        subject: `Hotel Application Received - ${requestId}`,
        htmlContent: `<div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e5e7eb;border-radius:12px;color:#102033;max-width:620px">
            <h2 style="margin:0 0 10px;color:#075985">Gyan Garbh Partner Application</h2>
            <p>Dear ${safeHotelName},</p>
            <p>Your hotel onboarding dossier has been submitted successfully and is pending assistant verification.</p>
            <p style="margin:18px 0;padding:14px;border-radius:10px;background:#f8fafc;border:1px solid #dbe5f0"><strong>Request ID:</strong><br><span style="font-size:22px;color:#075985;letter-spacing:1px">${requestId}</span></p>
            <p>You can track or reference your application here: <a href="${trackingLink}" style="color:#075985;font-weight:700">${trackingLink}</a></p>
            <p style="color:#64748b;font-size:13px">Please keep this Request ID for all support conversations.</p>
        </div>`
    };
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: { accept: 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' }
    });
    return response.data;
}
async function sendOtpEmail({ to, otp, isReset, brevoApiKey }) {

    if (!SMTP_USER || !brevoApiKey) {

        const error = new Error('Brevo API credentials are missing.');

        error.code = 'BREVO_CONFIG_MISSING';

        throw error;

    }

    const payload = {

        sender: {

            name: 'Gyan Garbh',

            email: SMTP_USER

        },

        to: [{ email: to }],

        subject: isReset ? 'Reset Password OTP' : 'Verification Code',

        htmlContent: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">

                <h2 style="color: #1e3c72;">Gyan Garbh</h2>

                <p>Your 6-digit verification code is:</p>

                <h1 style="color: #ffc107; letter-spacing: 5px;">${otp}</h1>

                <p>This code is valid for 5 minutes.</p>

               </div>`

    };

    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {

        headers: {

            accept: 'application/json',

            'api-key': brevoApiKey,

            'content-type': 'application/json'

        }

    });

    return response.data;

}



if (!MONGO_URI) {

    console.error('Missing MONGODB_URI environment variable. Please set it in .env or Render settings.');

    process.exit(1);

}

const mongooseMajorVersion = Number((mongoose.version || '0').split('.')[0]);

const mongooseOptions = {

    ...(mongooseMajorVersion < 6 ? { useNewUrlParser: true, useUnifiedTopology: true } : {}),

    bufferCommands: false,

    serverSelectionTimeoutMS: 8000,

    connectTimeoutMS: 10000,

    socketTimeoutMS: 30000

};



const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const configuredMasterAdminEmails = String(process.env.MASTER_ADMIN_EMAILS || process.env.MASTER_ADMIN_EMAIL || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

const MASTER_ADMIN_EMAILS = Array.from(new Set([
    ADMIN_EMAIL,
    ...configuredMasterAdminEmails
].filter(Boolean)));

const shouldTreatAsAdmin = (email) => {
    const normalizedEmail = normalizeEmail(email);
    return Boolean(normalizedEmail && MASTER_ADMIN_EMAILS.includes(normalizedEmail));
};

async function ensureAdminRoleForEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !shouldTreatAsAdmin(normalizedEmail)) {
        return null;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
        return null;
    }

    const updatedUser = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
            $set: {
                role: 'admin',
                supportTier: 'admin',
                updatedAt: new Date(),
                lastActive: new Date()
            }
        },
        { new: true }
    );

    return updatedUser;
}

async function ensureAdminUser() {

    try {

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {

            console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is not configured. Admin seed skipped.');

            return;

        }



        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        for (const adminEmail of MASTER_ADMIN_EMAILS) {
            await User.findOneAndUpdate(

                { email: adminEmail },

                {
                    name: 'Admin',
                    fullName: 'Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    supportTier: 'admin',
                    phone: '',
                    address: ''
                },

                { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }

            );
        }



        console.log('Admin Control Synced with MongoDB');

    } catch (err) {

        console.error('Admin seeding failed:', err);

    }

}



async function ensureOperationalIndexes() {

    try {

        const indexes = await User.collection.indexes();

        const legacyUniquePhoneIndex = indexes.find((index) => index.unique && index.key && index.key.phone === 1);

        if (legacyUniquePhoneIndex) {

            await User.collection.dropIndex(legacyUniquePhoneIndex.name);

            console.log(`Dropped legacy unique phone index: ${legacyUniquePhoneIndex.name}`);

        }

    } catch (err) {

        console.warn('Operational index maintenance skipped:', err.message);

    }

}



let cachedMongoose = global.mongoose;
if (!cachedMongoose) cachedMongoose = global.mongoose = { conn: null, promise: null, initialized: false };
global.__gyanGarbhMongoose = cachedMongoose;

function withDatabaseTimeout(promise, ms, message) {
    let timer;
    return Promise.race([
        Promise.resolve(promise).finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(message || 'Database operation timed out')), ms);
        })
    ]);
}

async function waitForAssistantLoginDatabase(timeoutMs = 5000) {
    cachedMongoose = global.mongoose || cachedMongoose;
    if (!global.mongoose) global.mongoose = cachedMongoose;
    global.__gyanGarbhMongoose = cachedMongoose;

    if (cachedMongoose.conn && mongoose.connection.readyState === 1) return cachedMongoose.conn;
    if (mongoose.connection.readyState === 2 && cachedMongoose.promise) {
        return withDatabaseTimeout(cachedMongoose.promise, timeoutMs, 'Assistant login database reconnect timed out');
    }
    return withDatabaseTimeout(connectDatabase(), timeoutMs, 'Assistant login database connection timed out');
}

async function connectDatabase() {

    if (cachedMongoose.conn && mongoose.connection.readyState === 1) return cachedMongoose.conn;

    if (!cachedMongoose.promise) {

        cachedMongoose.promise = mongoose.connect(MONGO_URI, mongooseOptions).then((mongooseInstance) => mongooseInstance);

    }

    try {
        cachedMongoose.conn = await cachedMongoose.promise;
    } catch (error) {
        cachedMongoose.promise = null;
        throw error;
    }

    if (!cachedMongoose.initialized) {

        cachedMongoose.initialized = true;

        console.log('MongoDB connected successfully for Gyan Garbh Database.');

        await ensureAdminUser();

        await ensureOperationalIndexes();

    }

    return cachedMongoose.conn;

}

app.use(async (req, res, next) => {

    try {

        if (isAssistantLoginRequest(req.path)) return next();

        await connectDatabase();

        next();

    } catch (err) {

        console.error('DATABASE ERROR:', err.message);

        res.status(503).json({ success: false, message: 'Database connection unavailable' });

    }

});

if (require.main === module) {

    connectDatabase().catch((err) => console.error('DATABASE ERROR:', err.message));

}



app.get('/api/health', (req, res) => {

    res.status(200).json({ success: true, service: 'Gyan Garbh API', uptime: process.uptime(), timestamp: new Date().toISOString() });

});

app.get('/ping', (req, res) => {

    res.status(200).json({ success: true, pong: true, timestamp: new Date().toISOString() });

});

app.get('/health', (req, res) => {

    const databaseConnected = mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({

        success: databaseConnected,

        service: 'Gyan Garbh API',

        database: databaseConnected ? 'connected' : 'disconnected',

        realtimeClients: realtimeClients.size

    });

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ ADMIN LOGIN ROUTE ---

// ---------------------------------------------------------



app.post(['/admin-login', '/admin/login', '/api/admin-login', '/api/admin/login'], async (req, res) => {

    try {

        const { email, password, otp, adminPin } = req.body;

        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) {

            appendAuditLog(req, 'ADMIN_LOGIN_BAD_REQUEST', normalizedEmail || 'unknown', 'failed');

            return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        }

        if (!ADMIN_MASTER_PIN) {

            appendAuditLog(req, 'ADMIN_LOGIN_PIN_NOT_CONFIGURED', normalizedEmail, 'failed');

            return res.status(500).json({ success: false, message: 'Admin security PIN is not configured.' });

        }

        const assistantAdmin = await Assistant.findOne({
            email: normalizedEmail,
            role: 'admin',
            isActive: true
        });

        const adminUser = assistantAdmin ? null : await User.findOne({ email: normalizedEmail });



        if (!assistantAdmin && !adminUser) {

            await logSecurityEvent('Failed Login', email || 'unknown', email || 'unknown', 'admin', 'Admin login attempted with invalid email');
            appendAuditLog(req, 'ADMIN_LOGIN_FAILED_INVALID_EMAIL', normalizedEmail || 'unknown', 'failed');

            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

        }



        const promotedAdminUser = assistantAdmin ? null : await ensureAdminRoleForEmail(normalizedEmail);
        const activeAdminUser = assistantAdmin || promotedAdminUser || adminUser;

        const passwordMatch = await bcrypt.compare(password, activeAdminUser.password);

        if (!passwordMatch) {

            await logSecurityEvent('Failed Login', activeAdminUser.name || 'Admin', email, 'admin', 'Admin login attempted with invalid password');
            appendAuditLog(req, 'ADMIN_LOGIN_FAILED_INVALID_PASSWORD', normalizedEmail, 'failed');

            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

        }

        if (!otp || !adminPin) {

            const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();

            if (!brevoApiKey) {

                appendAuditLog(req, 'ADMIN_OTP_SEND_FAILED_CONFIG', normalizedEmail, 'failed');

                return res.status(500).json({ success: false, message: 'OTP email service is not configured.' });

            }

            const code = Math.floor(100000 + Math.random() * 900000);
            const expiresAt = Date.now() + 5 * 60 * 1000;

            if (otpStore[normalizedEmail]?.timeoutId) clearTimeout(otpStore[normalizedEmail].timeoutId);

            const timeoutId = setTimeout(() => {
                delete otpStore[normalizedEmail];
            }, 5 * 60 * 1000);

            otpStore[normalizedEmail] = { code, expiresAt, timeoutId, purpose: 'admin-login' };

            await sendOtpEmail({ to: normalizedEmail, otp: code, isReset: false, brevoApiKey });
            appendAuditLog(req, 'ADMIN_OTP_SENT', normalizedEmail, 'success');

            return res.status(200).json({
                success: true,
                otpRequired: true,
                pinRequired: true,
                message: 'Admin OTP sent. Enter OTP and Master PIN to continue.'
            });

        }

        const record = otpStore[normalizedEmail];

        if (!record || record.purpose !== 'admin-login' || record.code != String(otp).trim()) {

            await logSecurityEvent('Failed Login', activeAdminUser.name || 'Admin', email, 'admin', 'Admin login attempted with invalid OTP');
            appendAuditLog(req, 'ADMIN_LOGIN_FAILED_INVALID_OTP', normalizedEmail, 'failed');

            return res.status(401).json({ success: false, message: 'Invalid admin OTP or credentials' });

        }

        if (record.expiresAt < Date.now()) {

            if (record.timeoutId) clearTimeout(record.timeoutId);
            delete otpStore[normalizedEmail];
            appendAuditLog(req, 'ADMIN_LOGIN_FAILED_EXPIRED_OTP', normalizedEmail, 'failed');

            return res.status(401).json({ success: false, message: 'Admin OTP expired. Please login again.' });

        }

        if (!timingSafeEquals(adminPin, ADMIN_MASTER_PIN)) {

            await logSecurityEvent('Failed Login', activeAdminUser.name || 'Admin', email, 'admin', 'Admin login attempted with invalid master PIN');
            appendAuditLog(req, 'ADMIN_LOGIN_FAILED_INVALID_PIN', normalizedEmail, 'failed');

            return res.status(401).json({ success: false, message: 'Invalid admin OTP or credentials' });

        }

        if (record.timeoutId) clearTimeout(record.timeoutId);
        delete otpStore[normalizedEmail];

        const sessionToken = createSessionToken('admin', activeAdminUser.email, ADMIN_JWT_EXPIRES_IN);

        res.cookie('authToken', sessionToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            maxAge: parseDurationMs(ADMIN_JWT_EXPIRES_IN, 20 * 60 * 1000),
            path: '/'
        });

        await logSecurityEvent('Successful Login', activeAdminUser.name || 'Admin', activeAdminUser.email, 'admin', 'Admin completed OTP and PIN authentication');
        appendAuditLog(req, 'ADMIN_LOGIN_SUCCESS', activeAdminUser.email, 'success');



        res.status(200).json({

            success: true,

            message: 'Admin Login Successful',

            role: 'admin',

            userRole: 'admin',

            name: activeAdminUser.name,

            email: activeAdminUser.email,

            sessionToken,

            expiresIn: ADMIN_JWT_EXPIRES_IN,

            idleTimeoutMs: ADMIN_IDLE_TIMEOUT_MS

        });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â OTP ROUTES (Signup + Reset) ---

// ---------------------------------------------------------



app.post(['/api/customer-auth/start', '/customer-auth/start'], async (req, res) => {

    let normalizedEmail = '';

    try {

        const { identifier, email, phone } = req.body;

        const rawIdentifier = String(identifier || email || '').trim();

        normalizedEmail = rawIdentifier.toLowerCase();

        if (!isValidEmail(normalizedEmail)) {

            return res.status(400).json({ success: false, message: 'Please enter a valid email address for OTP delivery.', data: null });

        }

        const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();

        if (!brevoApiKey) {

            return res.status(500).json({ success: false, message: 'Brevo API key is missing in environment variables.', data: null });

        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        const otp = Math.floor(100000 + Math.random() * 900000);

        const expiresAt = Date.now() + 5 * 60 * 1000;

        if (otpStore[normalizedEmail]?.timeoutId) clearTimeout(otpStore[normalizedEmail].timeoutId);

        const timeoutId = setTimeout(() => {

            delete otpStore[normalizedEmail];

            delete progressiveAuthStore[normalizedEmail];

        }, 5 * 60 * 1000);

        otpStore[normalizedEmail] = { code: otp, expiresAt, timeoutId };

        progressiveAuthStore[normalizedEmail] = {

            email: normalizedEmail,

            phone: normalizePhone(phone || ''),

            existingUserId: existingUser?._id || null,

            isExisting: Boolean(existingUser),

            expiresAt

        };

        await sendOtpEmail({ to: normalizedEmail, otp, isReset: false, brevoApiKey });

        res.json({ success: true, message: 'OTP sent successfully.', data: { destination: normalizedEmail, isExisting: Boolean(existingUser) } });

    } catch (error) {

        if (normalizedEmail && otpStore[normalizedEmail]?.timeoutId) clearTimeout(otpStore[normalizedEmail].timeoutId);

        if (normalizedEmail) {

            delete otpStore[normalizedEmail];

            delete progressiveAuthStore[normalizedEmail];

        }

        res.status(500).json({ success: false, message: error.response ? error.response.data.message : error.message, data: null });

    }

});

app.post(['/api/customer-auth/verify', '/customer-auth/verify'], async (req, res) => {

    try {

        const normalizedEmail = String(req.body.email || req.body.identifier || '').trim().toLowerCase();

        const otp = String(req.body.otp || '').replace(/D/g, '');

        const record = otpStore[normalizedEmail];

        const pending = progressiveAuthStore[normalizedEmail];

        if (!record || record.code != otp || !pending) return res.status(400).json({ success: false, message: 'Invalid OTP', data: null });

        if (record.expiresAt < Date.now() || pending.expiresAt < Date.now()) {

            if (record.timeoutId) clearTimeout(record.timeoutId);

            delete otpStore[normalizedEmail];

            delete progressiveAuthStore[normalizedEmail];

            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new code.', data: null });

        }

        if (record.timeoutId) clearTimeout(record.timeoutId);

        delete otpStore[normalizedEmail];

        const existingUser = pending.existingUserId ? await User.findById(pending.existingUserId) : await User.findOne({ email: normalizedEmail });

        if (existingUser) {

            delete progressiveAuthStore[normalizedEmail];

            const sessionToken = createSessionToken(existingUser.role || 'customer', existingUser.email);

            return res.json({ success: true, message: 'Login verified successfully.', data: { needsName: false }, userId: existingUser._id, name: existingUser.name || existingUser.fullName || 'Guest', email: existingUser.email, role: existingUser.role || 'customer', phone: existingUser.phone || '', sessionToken });

        }

        const setupToken = crypto.randomBytes(32).toString('hex');

        pending.setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');

        pending.setupExpiresAt = Date.now() + 10 * 60 * 1000;

        return res.json({ success: true, message: 'OTP verified. Complete your profile.', data: { needsName: true, setupToken, email: normalizedEmail, phone: pending.phone || '' } });

    } catch (error) {

        res.status(500).json({ success: false, message: error.message || 'Unable to verify OTP.', data: null });

    }

});

app.post(['/api/customer-auth/complete', '/customer-auth/complete'], async (req, res) => {

    try {

        const normalizedEmail = String(req.body.email || '').trim().toLowerCase();

        const name = String(req.body.name || req.body.fullName || '').trim();

        const password = String(req.body.password || '').trim();

        const setupToken = String(req.body.setupToken || '');

        const pending = progressiveAuthStore[normalizedEmail];

        if (!pending || !pending.setupTokenHash || pending.setupExpiresAt < Date.now()) return res.status(400).json({ success: false, message: 'Signup session expired. Please request OTP again.', data: null });

        const tokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');

        if (tokenHash !== pending.setupTokenHash) return res.status(400).json({ success: false, message: 'Invalid signup session.', data: null });

        if (!name) return res.status(400).json({ success: false, message: 'Name is required.', data: null });

        if (!isStrongEnoughPassword(password)) return res.status(400).json({ success: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, data: null });

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) return res.status(400).json({ success: false, message: 'This email is already registered.', data: null });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({

            name,

            fullName: name,

            email: normalizedEmail,

            password: hashedPassword,

            role: 'customer',

            phone: pending.phone || '',

            villageCity: 'Bodhgaya',

            address: '',

            pinCode: ''

        });

        await newUser.save();

        delete progressiveAuthStore[normalizedEmail];

        const sessionToken = createSessionToken(newUser.role || 'customer', newUser.email);

        res.status(201).json({ success: true, message: 'Account created successfully.', userId: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone, sessionToken, data: { userId: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone } });

    } catch (error) {

        res.status(500).json({ success: false, message: error.message || 'Unable to complete signup.', data: null });

    }

});

app.post(['/send-otp', '/api/send-otp'], async (req, res) => {

    let normalizedEmail = '';

    try {

        const { email, isReset, name, fullName, password, role, experience, phone, dob, dateOfBirth, village, villageCity, city, pinCode, pincode, pin, address, hotelName, tradeLicense, gstNumber, aadhaarPan, policeNoc, bankDetails, idDocumentType, idNumber, idFrontPhoto, idBackPhoto, bankName, accountHolderName, accountNumber, ifscCode, cancelledChequeImage, paymentQrImage, propertyFrontPhoto, receptionPhoto, roomPhotos, termsAccepted, termsDeclaration } = req.body;

        normalizedEmail = String(email || '').trim().toLowerCase();

        const requestedRole = ['guest', 'mitra', 'customer', 'hotel'].includes(role) ? role : 'customer';

        const cleanRole = requestedRole === 'hotel' ? 'hotel' : requestedRole === 'mitra' ? 'mitra' : 'customer';



        if (!isValidEmail(normalizedEmail)) {

            return res.status(400).json({ success: false, message: "A valid email address is required." });

        }

        console.log("Checking Env Brevo Key Exists:", !!process.env.BREVO_API_KEY);
        console.log("Env Key Length:", process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim().length : 0);

        const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();

        if (!brevoApiKey) {

            console.error("BREVO_API_KEY is undefined or empty in process.env!");

            return res.status(500).json({
                success: false,
                message: "Brevo API key is missing in environment variables."
            });

        }



        const userExists = await User.findOne({ email: normalizedEmail });

        const hotelExists = await Hotel.findOne({ $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] });



        if (!isReset) {

            const hasRequiredHotelDetails = requestedRole === 'hotel' && hotelName && password;

            const resolvedVillageCity = villageCity || village || city || address;

            const resolvedPinCode = pinCode || pincode || pin;

            const hasRequiredGuestDetails = ['guest', 'customer'].includes(requestedRole) && (name || fullName) && password && phone && resolvedVillageCity;

            const hasRequiredMitraDetails = requestedRole === 'mitra' && name && password;

            const hasPendingRegistration = Boolean(pendingRegistrationStore[normalizedEmail]);



            if (!hasRequiredHotelDetails && !hasRequiredGuestDetails && !hasRequiredMitraDetails && !hasPendingRegistration) {

                return res.status(400).json({ success: false, message: "Please fill all signup details before sending OTP." });

            }

            if (!hasPendingRegistration && !isStrongEnoughPassword(password)) {

                return res.status(400).json({ success: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });

            }

            if (phone && !isValidPhone(phone)) {

                return res.status(400).json({ success: false, message: 'Please enter a valid phone number.' });

            }

            if (userExists || hotelExists) {

                return res.status(400).json({ success: false, message: "This email is already registered." });

            }

            if (!hasPendingRegistration) {

                pendingRegistrationStore[normalizedEmail] = {

                    name: fullName || name || hotelName,

                    fullName: fullName || name || hotelName,

                    email: normalizedEmail,

                    password,

                    role: cleanRole,

                    requestedRole,

                    experience: experience || "",

                    phone: normalizePhone(phone || ''),

                    dob: parseDob(dob || dateOfBirth),

                    villageCity: resolvedVillageCity || "",

                    pinCode: String(resolvedPinCode || '').trim(),

                    address: address || resolvedVillageCity || "",

                    hotelName,

                    ownerEmail: normalizedEmail,

                    location: resolvedVillageCity || hotelName || "Bodhgaya",

                    kycDocuments: {

                        tradeLicense: String(tradeLicense || '').trim(),

                        gstNumber: String(gstNumber || '').trim(),

                        aadhaarPan: String(aadhaarPan || '').trim(),

                        idDocumentType: String(idDocumentType || '').trim(),

                        idNumber: String(idNumber || '').trim(),

                        idFrontPhoto: String(idFrontPhoto || '').trim(),

                        idBackPhoto: String(idBackPhoto || '').trim(),

                        policeNoc: String(policeNoc || '').trim(),

                        bankName: String(bankName || '').trim(),

                        accountHolderName: String(accountHolderName || '').trim(),

                        accountNumber: String(accountNumber || '').trim(),

                        ifscCode: String(ifscCode || '').trim(),

                        bankDetails: String(bankDetails || '').trim(),

                        cancelledChequeImage: String(cancelledChequeImage || '').trim(),

                        paymentQrImage: String(paymentQrImage || '').trim(),

                        propertyFrontPhoto: String(propertyFrontPhoto || '').trim(),

                        receptionPhoto: String(receptionPhoto || '').trim(),

                        roomPhotos: String(roomPhotos || '').trim(),

                        termsAccepted: termsAccepted === true || termsAccepted === 'true',

                        termsDeclaration: String(termsDeclaration || '').trim()

                    }

                };

            }

        } else {

            if (!userExists && !hotelExists) {

                return res.status(400).json({ success: false, message: "This email is not registered." });

            }

        }



        const otp = Math.floor(100000 + Math.random() * 900000);

        const expiresAt = Date.now() + 5 * 60 * 1000;

        if (otpStore[normalizedEmail] && otpStore[normalizedEmail].timeoutId) {

            clearTimeout(otpStore[normalizedEmail].timeoutId);

        }

        const timeoutId = setTimeout(() => {

            delete otpStore[normalizedEmail];

            delete pendingRegistrationStore[normalizedEmail];

        }, 5 * 60 * 1000);



        otpStore[normalizedEmail] = { code: otp, expiresAt, timeoutId };



        const brevoResponse = await sendOtpEmail({ to: normalizedEmail, otp, isReset, brevoApiKey });

        console.log("Brevo Success:", brevoResponse);

        res.json({ success: true, message: "OTP Sent" });

    } catch (error) {

        if (normalizedEmail && otpStore[normalizedEmail]?.timeoutId) clearTimeout(otpStore[normalizedEmail].timeoutId);

        if (normalizedEmail) delete otpStore[normalizedEmail];

        console.error("Brevo API Error Data:", error.response ? error.response.data : error.message);

        res.status(500).json({
            success: false,
            message: error.response ? error.response.data.message : error.message
        });

    }

});



app.post(['/verify-otp', '/api/verify-otp'], async (req, res) => {

    try {

        const { email, otp } = req.body;

        const normalizedEmail = String(email || '').trim().toLowerCase();

        const record = otpStore[normalizedEmail];



        if (!record || record.code != otp) {

            return res.status(400).json({ success: false, message: 'Invalid OTP' });

        }



        if (record.expiresAt < Date.now()) {

            if (record.timeoutId) clearTimeout(record.timeoutId);

            delete otpStore[normalizedEmail];

            delete pendingRegistrationStore[normalizedEmail];

            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new code.' });

        }



        const pending = pendingRegistrationStore[normalizedEmail];



        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ FORGOT PASSWORD / PASSWORD RESET FLOW

        if (!pending) {

            if (record.timeoutId) clearTimeout(record.timeoutId);

            delete otpStore[normalizedEmail];

            const resetToken = crypto.randomBytes(32).toString('hex');

            resetAuthorizationStore[normalizedEmail] = {

                tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'),

                expiresAt: Date.now() + RESET_TTL_MS

            };

            return res.json({ success: true, message: 'OTP verified successfully.', resetToken });

        }



        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ NEW HOTEL PARTNER ACCOUNT CREATION

        if (pending.role === 'hotel') {

            const hashedPassword = await bcrypt.hash(pending.password, 10);

            const newHotel = new Hotel({

                hotelName: pending.hotelName,

                ownerEmail: pending.ownerEmail,

                password: hashedPassword,

                phone: pending.phone,

                address: pending.address,

                location: pending.location,

                rooms: [],

                roomRate: 1500,

                rating: 4.0,

                description: `Welcome to ${pending.hotelName}`,

                isLocked: true,

                isAvailable: false

            });

            await newHotel.save();

            const requestId = await createUniqueHotelRequestId();

            const trackingLink = `${hotelTrackingBaseUrl()}/hotel-auth.html?requestId=${encodeURIComponent(requestId)}`;

            await Hotel.collection.updateOne(

                { _id: newHotel._id },

                { $set: { isVerified: false, verificationStatus: 'Pending Verification', kycDocuments: pending.kycDocuments || {}, applicationRequestId: requestId, applicationTrackingLink: trackingLink, applicationSubmittedAt: new Date(), updatedAt: new Date() } }

            );

            await createSystemNotification({
                title: 'New Hotel Registration',
                message: `New Hotel Registration: ${requestId} pending review`,
                type: 'hotel-registration',
                entityType: 'Hotel',
                entityId: newHotel._id,
                audience: ['admin', 'assistant'],
                createdBy: pending.email
            });

            try {

                await sendHotelApplicationConfirmationEmail({ to: pending.ownerEmail, hotelName: pending.hotelName, requestId, trackingLink, brevoApiKey: String(process.env.BREVO_API_KEY || '').trim() });

            } catch (mailError) {

                console.warn('Hotel application confirmation email failed:', mailError.message);

            }



            // Delete cache only AFTER successful database storage

            if (record.timeoutId) clearTimeout(record.timeoutId);

            delete otpStore[normalizedEmail];

            delete pendingRegistrationStore[normalizedEmail];



            return res.json({ success: true, message: 'Hotel owner registered successfully. Your account is pending assistant verification.', role: 'hotel', name: pending.name, email: pending.email, verificationStatus: 'Pending Verification', requestId, applicationRequestId: requestId, trackingLink });

        }



        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ NEW CUSTOMER / MITRA REGISTRATION

        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â VALIDATE PENDING DATA BEFORE CREATING USER

        const cleanName = String(pending.name || pending.fullName || '').trim();

        const cleanFullName = String(pending.fullName || pending.name || '').trim();



        if (!cleanName) {

            throw new Error('User name/fullName is required but not found in pending data. Please retry signup.');

        }



        const hashedPassword = await bcrypt.hash(pending.password, 10);

        const newUser = new User({

            name: cleanName,

            fullName: cleanFullName || cleanName,

            email: pending.email,

            password: hashedPassword,

            role: pending.requestedRole === 'mitra' || pending.role === 'mitra' ? 'mitra' : 'customer',

            experience: pending.experience || '',

            phone: pending.phone || '',

            dob: pending.dob || null,

            villageCity: pending.villageCity || '',

            pinCode: pending.pinCode || '',

            address: pending.address || ''

        });

        await newUser.save();



        // Delete cache only AFTER successful database storage

        if (record.timeoutId) clearTimeout(record.timeoutId);

        delete otpStore[normalizedEmail];

        delete pendingRegistrationStore[normalizedEmail];



        return res.json({ success: true, message: 'Registered successfully.', role: newUser.role, userId: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, sessionToken: createSessionToken(newUser.role, newUser.email) });

    } catch (err) {

        console.error('Verify OTP error:', err.message, err.stack);

        if (err && err.code === 11000) {

            const duplicatedField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'account field';

            return res.status(409).json({

                success: false,

                message: `${duplicatedField} is already linked with another account. Please use a different value or login instead.`,

                errorType: 'DUPLICATE_ACCOUNT'

            });

        }

        if (err && err.name === 'ValidationError') {

            const errorDetails = Object.keys(err.errors || {}).map(field => `${field}: ${err.errors[field].message}`).join('; ');

            return res.status(400).json({ success: false, message: `Account validation failed: ${errorDetails}`, errorType: 'VALIDATION_ERROR' });

        }

        return res.status(500).json({ success: false, message: err.message || 'OTP verification failed. Please try again.', errorType: 'SERVER_ERROR' });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¹Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ USER & MITRA ROUTES ---

// ---------------------------------------------------------



app.post('/api/admin/ensure-admin-role', async (req, res) => {
    try {
        const { email } = req.body || {};
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const updatedUser = await ensureAdminRoleForEmail(normalizedEmail);

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'Matching user not found for admin promotion.' });
        }

        return res.json({
            success: true,
            message: 'Admin role enforced successfully.',
            email: updatedUser.email,
            role: updatedUser.role
        });
    } catch (error) {
        console.error('Ensure admin role error:', error.message);
        return res.status(500).json({ success: false, message: 'Unable to enforce admin role.' });
    }
});

app.post(['/login', '/api/login', '/api/auth/login'], async (req, res) => {

    try {

        const { email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {

            // User not found - provide helpful message

            return res.status(401).json({ success: false, message: "Invalid email or password. If you haven't signed up yet, please create an account first.", errorType: 'NO_ACCOUNT' });

        }

        const promotedAdminUser = await ensureAdminRoleForEmail(normalizedEmail);
        const activeUser = promotedAdminUser || user;
        const isAdminIdentity = shouldTreatAsAdmin(normalizedEmail) || activeUser.role === 'admin';

        const passwordMatch = await bcrypt.compare(password, activeUser.password);

        if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid email or password. Please check and try again.", errorType: 'INVALID_PASSWORD' });

        const responseRole = isAdminIdentity ? 'admin' : activeUser.role;

        res.status(200).json({

            success: true,

            userId: activeUser._id,

            name: activeUser.name,

            fullName: activeUser.fullName || activeUser.name,

            email: activeUser.email,

            phone: activeUser.phone,

            role: responseRole,

            profilePic: activeUser.profilePic || activeUser.photoURL || '',

            sessionToken: createSessionToken(responseRole, activeUser.email)

        });

    } catch (err) {

        console.error('Login error:', err.message);

        res.status(500).json({ success: false, message: 'Login failed. Please try again.', errorType: 'SERVER_ERROR' });

    }

});



app.post('/api/user/upload-profile-pic', requireSession(['customer', 'mitra', 'support', 'driver', 'admin', 'assistant']), uploadProfilePic.single('profilePic'), async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({ success: false, message: 'No profile picture uploaded.' });

        }



        const profilePicUrl = req.file.path || req.file.secure_url || req.file.url;

        if (!profilePicUrl) {

            return res.status(500).json({ success: false, message: 'Uploaded file did not return a valid URL.' });

        }



        if (req.session?.email) {

            const updatedUser = await User.findOneAndUpdate(

                { email: normalizeEmail(req.session.email) },

                { profilePic: profilePicUrl, photoURL: profilePicUrl, updatedAt: new Date() },

                { new: true }

            ).select('-password');



            if (!updatedUser) {

                return res.status(404).json({ success: false, message: 'User not found.' });

            }



            return res.json({ success: true, message: 'Profile picture updated successfully.', profilePic: updatedUser.profilePic || updatedUser.photoURL });

        }



        res.json({ success: true, message: 'Profile picture uploaded successfully.', profilePic: profilePicUrl });

    } catch (err) {

        console.error('Profile picture upload error:', err);

        res.status(500).json({ success: false, message: 'Profile picture upload failed.' });

    }

});



app.get('/api/user/profile', requireSession(['customer', 'mitra', 'support', 'driver', 'admin', 'assistant']), async (req, res) => {

    try {

        const user = await User.findOne({ email: normalizeEmail(req.session.email) }).select(publicUserFields);

        if (!user) return res.status(404).json({ success: false, message: 'Profile not found' });

        res.json({ success: true, profile: buildSafeUserProfile(user) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/api/user/profile', requireSession(['customer', 'mitra', 'support', 'driver']), async (req, res) => {
    try {
        const { fullName, name, dob, villageCity, city, pinCode, profilePic, phone, bio } = req.body;
        const updateData = { updatedAt: new Date() };
        const finalName = String(fullName || name || '').trim();

        if (finalName) {
            updateData.name = finalName;
            updateData.fullName = finalName;
        }
        if (dob !== undefined) updateData.dob = parseDob(dob);
        if (villageCity !== undefined || city !== undefined) {
            updateData.villageCity = String(villageCity || city || '').trim();
            updateData.address = updateData.villageCity;
        }
        if (pinCode !== undefined) updateData.pinCode = String(pinCode || '').trim();
        if (bio !== undefined) updateData.bio = String(bio || '').trim();
        if (profilePic !== undefined) {
            updateData.profilePic = String(profilePic || '').trim();
            updateData.photoURL = updateData.profilePic;
        }
        if (phone !== undefined && req.session.role !== 'customer') updateData.phone = normalizePhone(phone);

        const updatedUser = await User.findOneAndUpdate(
            { email: normalizeEmail(req.session.email) },
            updateData,
            { new: true, runValidators: true }
        ).select(publicUserFields);

        if (!updatedUser) return res.status(404).json({ success: false, message: 'Profile not found' });
        res.json({ success: true, message: 'Profile updated successfully', profile: buildSafeUserProfile(updatedUser) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/user/refund-preferences', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    try {
        const user = await User.findOne({ email: normalizeEmail(req.session.email) }).select('refundDetails');
        if (!user) return res.status(404).json({ success: false, message: 'Customer account not found' });
        res.json({
            success: true,
            refundDetails: user.refundDetails || { upiId: '', bankInfo: { accountNumber: '', ifsc: '', accountHolderName: '' }, preferredMethod: 'wallet' }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/user/refund-preferences', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    try {
        const currentUser = await User.findOne({ email: normalizeEmail(req.session.email) }).select('refundDetails');
        if (!currentUser) return res.status(404).json({ success: false, message: 'Customer account not found' });

        const { errors, refundDetails } = normalizeRefundDetails(req.body, currentUser.refundDetails || {});
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const updatedUser = await User.findOneAndUpdate(
            { email: normalizeEmail(req.session.email) },
            { $set: { refundDetails, updatedAt: new Date() } },
            { new: true, runValidators: true }
        ).select(publicUserFields);

        res.json({
            success: true,
            message: 'Refund payout preferences saved successfully.',
            refundDetails: updatedUser.refundDetails,
            profile: buildSafeUserProfile(updatedUser)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create mitra (Admin / Assistant)
app.post('/admin/create-mitra', verifyAdminOrAssistant('manageMitra'), async (req, res) => {
    try {
        const { name, email, phone, address, experience, imageUrl, createdBy, createdByRole } = req.body;
        const actorEmail = req.actor?.email || createdBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || createdByRole);

        if (!actorRole) {
            await logSecurityEvent('Unauthorized Mitra Creation', name || 'Unknown Mitra', actorEmail || 'unknown', req.actor?.role || createdByRole || 'unknown', 'Actor cannot create mitras');
            return res.status(403).json({ success: false, message: 'Unauthorized to create mitras' });
        }

        if (!name || !isValidEmail(email) || !isValidPhone(phone)) {
            return res.status(400).json({ success: false, message: 'Name, valid email and active mobile number are required.' });
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const generatedPassword = generateDefaultPassword();
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        const placeholderPhoto = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1';
        const cleanName = String(name || '').trim();
        const cleanAddress = String(address || '').trim();
        const newMitra = new User({
            name: cleanName,
            fullName: cleanName,
            email: normalizedEmail,
            password: hashedPassword,
            phone: normalizePhone(phone),
            address: cleanAddress,
            villageCity: cleanAddress,
            role: 'mitra',
            experience: String(experience || '').trim(),
            photoURL: imageUrl || placeholderPhoto,
            profilePic: imageUrl || placeholderPhoto,
            updatedBy: actorEmail,
            updatedAt: new Date(),
            isLocked: false
        });

        await newMitra.save();
        await logActivity('CREATE', 'Mitra', newMitra._id, newMitra.name, actorEmail, actorRole);
        emitRealtime('mitra-created', { mitra: newMitra, createdBy: actorEmail, actorRole });

        res.status(201).json({
            success: true,
            message: 'Mitra created successfully',
            mitra: newMitra,
            credentials: { email: newMitra.email, password: generatedPassword }
        });
    } catch (err) {
        console.error('Error creating mitra:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// Update mitra details
app.put('/admin/update-mitra', verifyAdminOrAssistant('manageMitra'), async (req, res) => {
    try {
        const { mitraId, name, email, phone, address, experience, imageUrl, updatedBy, updatedByRole } = req.body;
        const actorEmail = req.actor?.email || updatedBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || updatedByRole);

        if (!actorRole) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        if (!mitraId) {
            return res.status(400).json({ success: false, message: 'Mitra ID is required' });
        }

        const updateData = { updatedBy: actorEmail, updatedAt: new Date() };
        if (name !== undefined) {
            const cleanName = String(name || '').trim();
            updateData.name = cleanName;
            updateData.fullName = cleanName;
        }
        if (email !== undefined) updateData.email = normalizeEmail(email);
        if (phone !== undefined) updateData.phone = normalizePhone(phone);
        if (address !== undefined) {
            updateData.address = String(address || '').trim();
            updateData.villageCity = updateData.address;
        }
        if (experience !== undefined) updateData.experience = String(experience || '').trim();
        if (imageUrl !== undefined) {
            updateData.photoURL = String(imageUrl || '').trim();
            updateData.profilePic = updateData.photoURL;
        }

        const updatedMitra = await User.findByIdAndUpdate(
            mitraId,
            updateData,
            { new: true, runValidators: true, strict: false }
        ).select('-password');

        if (!updatedMitra) {
            return res.status(404).json({ success: false, message: 'Mitra not found' });
        }

        await logActivity('UPDATE', 'Mitra', mitraId, updatedMitra.name || updatedMitra.fullName, actorEmail, actorRole, { email, phone, address, experience });
        emitRealtime('mitra-updated', { mitra: updatedMitra, updatedBy: actorEmail, actorRole });
        res.json({ success: true, message: 'Mitra updated successfully', mitra: updatedMitra });
    } catch (err) {
        console.error('Error updating mitra:', err);
        res.status(500).json({ success: false, message: 'Error updating mitra' });
    }
});
// Delete mitra

app.delete('/admin/delete-mitra', verifyAdmin, async (req, res) => {

    try {

        const { mitraId, deletedBy, deletedByRole } = req.body;

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({ success: false, message: 'Only Admin can delete mitras permanently' });

        }



        const mitra = await User.findById(mitraId);

        if (!mitra) {

            return res.status(404).json({ success: false, message: 'Mitra not found' });

        }



        const activeBookings = await Booking.find({ mitraEmail: mitra.email, status: { $in: ['Pending', 'Confirmed'] } });

        if (activeBookings.length > 0) {

            return res.status(400).json({

                success: false,

                message: 'Cannot delete mitra with active bookings. Reassign or complete bookings first.'

            });

        }



        const deletedMitra = await User.findByIdAndDelete(mitraId);



        if (!deletedMitra) {

            return res.status(404).json({ success: false, message: 'Mitra not found' });

        }



        await Booking.deleteMany({ mitraEmail: deletedMitra.email });

        await ActivityLog.deleteMany({ $or: [

            { entityType: 'Mitra', entityId: mitraId },

            { performedBy: deletedMitra.email }

        ] });



        await logActivity('DELETE', 'Mitra', mitraId, deletedMitra.name, deletedBy || req.actor?.email, deletedByRole || req.actor?.role);

        emitRealtime('mitra-deleted', { mitraId, name: deletedMitra.name, deletedBy: deletedBy || req.actor?.email });



        res.json({ success: true, message: 'Mitra deleted successfully and related records cleaned up' });

    } catch (err) {

        console.error('Error deleting mitra:', err);

        res.status(500).json({ success: false, message: 'Error deleting mitra' });

    }

});



// Update customer enquiry status

app.put('/admin/update-customer', verifyAdminOrAssistant('manageCustomers'), async (req, res) => {

    try {

        const { customerId, customerName, customerEmail, customerPhone, status, updatedBy, updatedByRole } = req.body;

        const actorEmail = req.actor?.email || updatedBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || updatedByRole);

        if (!actorRole) {

            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        }



        const updatedCustomer = await Enquiry.findByIdAndUpdate(

            customerId,

            {

                customerName,

                customerEmail,

                customerPhone,

                status,

                updatedBy: actorEmail,

                updatedAt: new Date()

            },

            { new: true }

        );



        if (!updatedCustomer) {

            return res.status(404).json({ success: false, message: 'Customer not found' });

        }



        await logActivity('UPDATE', 'Customer', customerId, updatedCustomer.customerName, actorEmail, actorRole, { customerEmail, customerPhone, status });

        emitRealtime('customer-updated', { customer: updatedCustomer, updatedBy: actorEmail, actorRole });



        res.json({ success: true, message: 'Customer updated successfully', customer: updatedCustomer });

    } catch (err) {

        console.error('Error updating customer:', err);

        res.status(500).json({ success: false, message: 'Error updating customer' });

    }

});



// Delete customer enquiry

app.delete('/admin/delete-customer', verifyAdmin, async (req, res) => {

    try {

        const { customerId, deletedBy, deletedByRole } = req.body;

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({ success: false, message: 'Only Admin can delete customers permanently' });

        }



        const deletedCustomer = await Enquiry.findByIdAndDelete(customerId);



        if (!deletedCustomer) {

            return res.status(404).json({ success: false, message: 'Customer not found' });

        }



        await logActivity('DELETE', 'Customer', customerId, deletedCustomer.customerName, deletedBy || req.actor?.email, deletedByRole || req.actor?.role);

        emitRealtime('customer-deleted', { customerId, customerName: deletedCustomer.customerName, deletedBy: deletedBy || req.actor?.email });



        res.json({ success: true, message: 'Customer deleted successfully' });

    } catch (err) {

        console.error('Error deleting customer:', err);

        res.status(500).json({ success: false, message: 'Error deleting customer' });

    }

});



app.put('/admin/toggle-lock', verifyAdmin, async (req, res) => {

    try {

        const { entityType, entityId, isLocked, updatedBy, updatedByRole } = req.body;

        const actorEmail = req.actor?.email || updatedBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || updatedByRole);

        if (!actorRole) {

            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        }



        const locked = Boolean(isLocked);

        const update = { isLocked: locked, updatedBy: actorEmail, updatedAt: new Date() };

        let model = null;

        let entityName = '';



        if (entityType === 'hotel') model = Hotel;

        else if (entityType === 'customer') model = Enquiry;

        else if (entityType === 'mitra') model = User;

        else if (entityType === 'bodhi-path') model = BodhiPath;

        else return res.status(400).json({ success: false, message: 'Invalid entity type' });



        let query = model.findByIdAndUpdate(entityId, update, { new: true });

        if (entityType === 'mitra') query = query.select('-password');

        const entity = await query;

        if (!entity) {

            return res.status(404).json({ success: false, message: 'Item not found' });

        }



        entityName = entity.hotelName || entity.customerName || entity.name || entity.title || entityId;

        const logType = entityType === 'hotel' ? 'Hotel' : entityType === 'customer' ? 'Customer' : entityType === 'mitra' ? 'Mitra' : 'BodhiPath';

        await logActivity('TOGGLE_STATUS', logType, entityId, entityName, actorEmail, actorRole, { isLocked: locked });

        emitRealtime(`${entityType}-lock-updated`, { entityType, entityId, entityName, isLocked: locked, updatedBy: actorEmail });



        res.json({ success: true, message: `${entityName} ${locked ? 'locked' : 'unlocked'} successfully`, item: entity });

    } catch (err) {

        console.error('Toggle lock error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Update guest (regular user)

app.put('/admin/update-guest', verifyAdmin, async (req, res) => {

    try {

        const { guestId, name, email, phone, address } = req.body;



        const updatedGuest = await User.findByIdAndUpdate(

            guestId,

            { name, email, phone, address },

            { new: true }

        );



        if (!updatedGuest) {

            return res.status(404).json({ success: false, message: 'Guest not found' });

        }



        res.json({ success: true, message: 'Guest updated successfully', guest: updatedGuest });

    } catch (err) {

        console.error('Error updating guest:', err);

        res.status(500).json({ success: false, message: 'Error updating guest' });

    }

});



// Delete guest (regular user)

app.delete('/admin/delete-guest', verifyAdmin, async (req, res) => {

    try {

        const { guestId } = req.body;



        const deletedGuest = await User.findByIdAndDelete(guestId);



        if (!deletedGuest) {

            return res.status(404).json({ success: false, message: 'Guest not found' });

        }



        res.json({ success: true, message: 'Guest deleted successfully' });

    } catch (err) {

        console.error('Error deleting guest:', err);

        res.status(500).json({ success: false, message: 'Error deleting guest' });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ HOTEL PARTNER ROUTES ---

// ---------------------------------------------------------



app.post(['/hotel-login', '/api/hotel-login'], async (req, res) => {

    try {

        const { email, password } = req.body;

        const normalizedEmail = String(email || '').trim().toLowerCase();

        const hotel = await Hotel.findOne({

            $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }]

        });



        if (!isValidEmail(normalizedEmail) || !password) {

            return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        }



        if (hotel && await hotel.comparePassword(password)) {

            res.status(200).json({

                success: true,

                hotelName: hotel.hotelName,

                ownerEmail: hotel.ownerEmail || hotel.email,

                sessionToken: createSessionToken('hotel', hotel.ownerEmail || hotel.email)

            });

        } else {

            await logSecurityEvent('Failed Login', normalizedEmail || 'unknown', normalizedEmail || 'unknown', 'admin', 'Hotel login attempted with invalid credentials');

            res.status(401).json({ success: false, message: "Invalid Credentials!" });

        }

    } catch (err) { console.error('hotel-login error:', err); res.status(500).json({ success: false, message: 'Unable to login' }); }

});



app.get('/all-hotels', async (req, res) => {

    try {
        const hotels = await publicHotelQuery(Hotel.find({ isLocked: { $ne: true }, isAvailable: { $ne: false }, isVerified: { $ne: false } }));
        res.json(await enrichHotelsWithGvs(hotels));
    } catch (err) { res.status(500).send(err.message); }

});

app.get('/api/hotels', async (req, res) => {

    try {

        const hotels = await publicHotelQuery(Hotel.find({ isLocked: { $ne: true }, isAvailable: { $ne: false }, isVerified: { $ne: false } }));
        const rankedHotels = await enrichHotelsWithGvs(hotels);

        res.json({ success: true, data: rankedHotels, hotels: rankedHotels });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});

app.get('/api/hotels/:id', async (req, res) => {

    try {

        const hotelId = String(req.params.id || '').trim();

        if (!mongoose.Types.ObjectId.isValid(hotelId)) {

            return res.status(400).json({ success: false, message: 'Invalid hotel id' });

        }

        const hotel = await publicHotelQuery(Hotel.findOne({ _id: hotelId, isLocked: { $ne: true }, isAvailable: { $ne: false }, isVerified: { $ne: false } }));

        if (!hotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }

        const [enrichedHotel] = await enrichHotelsWithGvs([hotel]);
        res.json({ success: true, hotel: enrichedHotel });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});

app.get('/api/hotels/:id/availability', async (req, res) => {

    try {

        const hotelId = String(req.params.id || '').trim();
        const checkIn = String(req.query.checkIn || '').trim();
        const checkOut = String(req.query.checkOut || '').trim();

        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            return res.status(400).json({ success: false, message: 'Invalid hotel id' });
        }

        const validationError = validateBookingPayload({
            userName: 'Availability Check',
            hotelName: 'Availability Check',
            roomType: 'Availability Check',
            price: 1,
            checkIn,
            checkOut
        });
        if (validationError) return res.status(400).json({ success: false, message: validationError });

        const hotel = await publicHotelQuery(Hotel.findOne({ _id: hotelId, isLocked: { $ne: true }, isAvailable: { $ne: false }, isVerified: { $ne: false } }));
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });

        const checkInDate = new Date(`${checkIn}T00:00:00`);
        const checkOutDate = new Date(`${checkOut}T00:00:00`);
        const activeBookings = await Booking.find({
            hotelId,
            status: { $nin: ['Cancelled', 'Completed'] }
        }).select('checkIn checkOut roomType status');

        const overlappingBookings = activeBookings.filter((booking) => {
            const bookedIn = new Date(`${booking.checkIn}T00:00:00`);
            const bookedOut = new Date(`${booking.checkOut}T00:00:00`);
            return bookedIn < checkOutDate && bookedOut > checkInDate;
        });

        const totalRooms = Array.isArray(hotel.rooms) && hotel.rooms.length
            ? hotel.rooms.reduce((sum, room) => sum + (Number(room.roomsAvailable) || 1), 0)
            : (Number(hotel.totalRooms) || 1);
        const availableRooms = Math.max(totalRooms - overlappingBookings.length, 0);

        res.json({
            success: true,
            available: availableRooms > 0,
            status: availableRooms > 0 ? 'Available' : 'Full',
            totalRooms,
            bookedRooms: overlappingBookings.length,
            availableRooms
        });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message || 'Unable to check availability' });

    }

});

app.put('/api/hotels/:id', requireSession(['hotel', 'admin', 'assistant']), async (req, res) => {

    try {

        const hotelId = String(req.params.id || '').trim();

        if (!mongoose.Types.ObjectId.isValid(hotelId)) {

            return res.status(400).json({ success: false, message: 'Invalid hotel id' });

        }

        const hotel = await Hotel.findById(hotelId).select('-password');

        if (!hotel || hotel.isLocked === true) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }

        if (req.session.role === 'hotel' && normalizeEmail(hotel.ownerEmail) !== normalizeEmail(req.session.email)) {

            return res.status(403).json({ success: false, message: 'Unauthorized hotel update' });

        }

        const {
            hotelName,
            roomRate,
            totalRooms,
            acRoomPrice,
            nonAcRoomPrice,
            description,
            facilities,
            imageUrl,
            imageUrl2,
            imageUrl3,
            images,
            hotelImages,
            rooms,
            distanceFromLandmark,
            gyanGarbhHighlights
        } = req.body || {};

        if (hotelName !== undefined) hotel.hotelName = String(hotelName || '').trim() || hotel.hotelName;
        if (roomRate !== undefined && roomRate !== '') hotel.roomRate = Number(roomRate) || hotel.roomRate;
        if (totalRooms !== undefined && totalRooms !== '') hotel.totalRooms = Number(totalRooms) || hotel.totalRooms;
        if (acRoomPrice !== undefined && acRoomPrice !== '') hotel.acRoomPrice = Number(acRoomPrice) || hotel.acRoomPrice;
        if (nonAcRoomPrice !== undefined && nonAcRoomPrice !== '') hotel.nonAcRoomPrice = Number(nonAcRoomPrice) || hotel.nonAcRoomPrice;
        if (description !== undefined) hotel.description = String(description || '');
        if (facilities !== undefined && typeof facilities === 'object') hotel.facilities = facilities || {};
        if (imageUrl !== undefined) hotel.imageUrl = String(imageUrl || '').trim();
        if (imageUrl2 !== undefined) hotel.imageUrl2 = String(imageUrl2 || '').trim();
        if (imageUrl3 !== undefined) hotel.imageUrl3 = String(imageUrl3 || '').trim();
        const requestedImages = hotelImages !== undefined ? hotelImages : images;
        if (requestedImages !== undefined) hotel.images = Array.isArray(requestedImages) ? requestedImages.map((url) => String(url || '').trim()).filter(Boolean) : [];
        if (Array.isArray(rooms)) {
            hotel.rooms = rooms.map((room) => ({
                roomType: String(room.roomType || 'Room').trim(),
                price: Number(room.price) || 0,
                roomsAvailable: Number(room.roomsAvailable) || 1,
                amenities: Array.isArray(room.amenities) ? room.amenities.map((item) => String(item || '').trim()).filter(Boolean) : [],
                images: Array.isArray(room.images) ? room.images.map((item) => String(item || '').trim()).filter(Boolean) : [],
                status: String(room.status || 'Available').trim() || 'Available'
            })).filter((room) => room.roomType && room.price >= 0);
        }
        if (distanceFromLandmark !== undefined) {
            hotel.distanceFromLandmark = {
                value: Number(distanceFromLandmark?.value) || 0,
                unit: String(distanceFromLandmark?.unit || 'km').trim() || 'km',
                landmark: String(distanceFromLandmark?.landmark || 'Mahabodhi Temple').trim() || 'Mahabodhi Temple'
            };
        }
        if (gyanGarbhHighlights !== undefined) hotel.gyanGarbhHighlights = String(gyanGarbhHighlights || '');

        hotel.updatedAt = new Date();
        await hotel.save();

        const updatedHotel = hotel.toObject();
        delete updatedHotel.password;

        emitRealtime('hotel-updated', { hotelId: updatedHotel._id, hotelName: updatedHotel.hotelName });
        res.json({ success: true, message: 'Hotel setup updated successfully', hotel: updatedHotel });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message || 'Unable to update hotel setup' });

    }

});

async function recomputeHotelReviewMetrics(hotelId) {
    const hotel = await Hotel.findById(hotelId).select('-password');
    if (!hotel) return null;
    const [enriched] = await enrichHotelsWithGvs([hotel]);
    hotel.averageRating = Number(enriched.averageRating || 0);
    hotel.totalReviews = Number(enriched.totalReviews || 0);
    hotel.gvsScore = Number(enriched.gvs?.gvsScore || 0);
    hotel.gvsRankStatus = enriched.gvs?.gvsRankStatus || 'New Property';
    hotel.categoryRatings = enriched.categoryRatings || {};
    hotel.updatedAt = new Date();
    await hotel.save();
    return enriched;
}

app.post('/api/reviews/submit', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    try {
        const hotelId = String(req.body.hotelId || '').trim();
        const bookingId = String(req.body.bookingId || '').trim();
        const comment = String(req.body.comment || '').trim();
        if (!mongoose.Types.ObjectId.isValid(hotelId)) return res.status(400).json({ success: false, message: 'Valid hotel ID is required' });
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid completed booking ID is required' });
        if (!comment || comment.length > 1000) return res.status(400).json({ success: false, message: 'Review comment is required and must be under 1000 characters' });

        const categoryResult = normalizeReviewCategories(req.body);
        if (categoryResult.error) return res.status(400).json({ success: false, message: categoryResult.error });

        const booking = await Booking.findOne({ _id: bookingId, userEmail: req.session.email, hotelId, status: { $ne: 'Cancelled' } });
        if (!booking || !isCompletedStayBooking(booking)) {
            return res.status(403).json({ success: false, message: 'Verified reviews unlock only after this stay is checked out/completed.' });
        }

        const duplicate = await Review.findOne({ bookingId: booking._id });
        if (duplicate) return res.status(409).json({ success: false, message: 'A verified review has already been submitted for this stay.' });

        const hotel = await Hotel.findById(hotelId).select('hotelName');
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        const user = await User.findOne({ email: req.session.email }).select('_id name fullName email');
        const disputeStatus = categoryResult.rating <= 2 ? 'flagged_48h' : 'none';
        const review = await Review.create({
            hotelId: hotel._id,
            hotelName: hotel.hotelName,
            bookingId: booking._id,
            userId: user?._id,
            userEmail: req.session.email,
            userName: user?.fullName || user?.name || booking.userName || 'Verified Guest',
            rating: categoryResult.rating,
            categories: categoryResult.categories,
            comment,
            isVerifiedStay: true,
            disputeStatus,
            disputeDeadline: disputeStatus === 'flagged_48h' ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null
        });

        const enrichedHotel = await recomputeHotelReviewMetrics(hotel._id);
        emitRealtime('verified-review-created', { hotelId: hotel._id, hotelName: hotel.hotelName, rating: review.rating, disputeStatus });
        res.status(201).json({ success: true, message: 'Verified stay review submitted', review, hotel: enrichedHotel });
    } catch (err) {
        if (err?.code === 11000) return res.status(409).json({ success: false, message: 'A verified review has already been submitted for this stay.' });
        res.status(500).json({ success: false, message: err.message || 'Unable to submit verified review' });
    }
});

app.post('/api/hotels/:id/reviews', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    return res.status(410).json({ success: false, message: 'Use /api/reviews/submit with a completed booking ID for verified stay reviews.' });
});

app.get('/api/reviews/hotel/:hotelId', async (req, res) => {
    try {
        const hotelId = String(req.params.hotelId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(hotelId)) return res.status(400).json({ success: false, message: 'Valid hotel ID is required' });
        const reviews = await Review.find({ hotelId, isVerifiedStay: true }).sort({ createdAt: -1 }).limit(100).lean();
        const summary = summarizeVerifiedReviews(reviews);
        res.json({ success: true, reviews, categoryBreakdown: summary.categoryBreakdown, averageRating: Number(summary.average.toFixed(1)), totalReviews: reviews.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to fetch reviews' });
    }
});

app.get(['/api/assistants/reviews', '/admin/reviews'], verifyAdminOrAssistant('manageBookings'), async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }).limit(300).lean();
        res.json({ success: true, reviews });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to fetch review feed' });
    }
});
app.post('/api/payment/create-order', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    try {
        const bookingId = String(req.body.bookingId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });

        const booking = await Booking.findOne({ _id: bookingId, userEmail: req.session.email, status: { $ne: 'Cancelled' } });
        if (!booking) return res.status(404).json({ success: false, message: 'Active booking not found for this customer' });

        const amount = toPaise(booking.totalPrice || booking.price);
        const receipt = createBookingReference(booking);
        const order = RAZORPAY_MOCK_MODE
            ? { id: `order_mock_${booking._id}`, amount, currency: 'INR', receipt, status: 'created' }
            : await razorpayRequest('POST', '/v1/orders', {
                amount,
                currency: 'INR',
                receipt,
                payment_capture: 0,
                notes: { bookingId: String(booking._id), mode: 'authorize' }
            });

        booking.bookingReference = receipt;
        booking.paymentProvider = RAZORPAY_MOCK_MODE ? 'razorpay_mock' : 'razorpay';
        booking.paymentMode = 'authorize';
        booking.paymentOrderId = order.id;
        booking.paymentStatus = 'Authorization Pending';
        booking.freeCancellationUntil = booking.freeCancellationUntil || calculateFreeCancellationUntil(booking);
        await booking.save();

        res.json({ success: true, mock: RAZORPAY_MOCK_MODE, keyId: RAZORPAY_KEY_ID || 'rzp_test_mock', mode: 'authorize', order, booking: decorateBookingForClient(booking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to create payment order' });
    }
});
app.post('/api/payment/verify-payment', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {
    try {
        const bookingId = String(req.body.bookingId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });

        const orderId = String(req.body.razorpay_order_id || req.body.orderId || '').trim();
        const paymentId = String(req.body.razorpay_payment_id || req.body.paymentId || '').trim();
        const signature = String(req.body.razorpay_signature || req.body.signature || '').trim();
        if (!orderId || !paymentId) return res.status(400).json({ success: false, message: 'Payment order and payment ID are required' });
        if (!verifyRazorpaySignature({ orderId, paymentId, signature })) return res.status(400).json({ success: false, message: 'Invalid Razorpay payment signature' });

        const booking = await Booking.findOne({ _id: bookingId, userEmail: req.session.email, status: { $ne: 'Cancelled' } });
        if (!booking) return res.status(404).json({ success: false, message: 'Active booking not found for this customer' });
        if (booking.paymentOrderId && booking.paymentOrderId !== orderId) return res.status(400).json({ success: false, message: 'Payment order does not match this booking' });

        const pass = buildBookingPass(booking);
        booking.status = 'Confirmed';
        booking.paymentProvider = RAZORPAY_MOCK_MODE || orderId.startsWith('order_mock_') ? 'razorpay_mock' : 'razorpay';
        booking.paymentMode = 'authorize';
        booking.paymentOrderId = orderId;
        booking.paymentId = paymentId;
        booking.paymentAuthorizationId = paymentId;
        booking.paymentSignature = signature;
        booking.paymentStatus = 'Authorized';
        booking.paymentAuthorizedAt = new Date();
        booking.freeCancellationUntil = booking.freeCancellationUntil || calculateFreeCancellationUntil(booking);
        booking.bookingReference = createBookingReference(booking);
        booking.qrPassTokenHash = sha256Hex(pass.token);
        booking.qrPassIssuedAt = booking.qrPassIssuedAt || new Date();
        await booking.save();

        emitRealtime('booking-payment-authorized', { bookingId: booking._id, hotelName: booking.hotelName, paymentStatus: booking.paymentStatus });
        res.json({ success: true, message: 'Payment authorized and booking confirmed', booking: decorateBookingForClient(booking), pass: buildBookingPass(booking), mock: booking.paymentProvider === 'razorpay_mock' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to verify payment' });
    }
});

app.post('/api/payment/capture/:bookingId', verifyAdminOrAssistant('manageBookings'), async (req, res) => {
    try {
        const bookingId = String(req.params.bookingId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status === 'Cancelled') return res.status(400).json({ success: false, message: 'Cancelled bookings cannot be captured' });
        if (booking.paymentStatus === 'Captured') return res.json({ success: true, message: 'Payment already captured', booking: decorateBookingForClient(booking) });
        if (booking.freeCancellationUntil && new Date(booking.freeCancellationUntil).getTime() > Date.now() && req.body.force !== true) {
            return res.status(409).json({ success: false, message: 'Free cancellation window is still active' });
        }
        if (!booking.paymentId) return res.status(400).json({ success: false, message: 'No authorized payment found for this booking' });

        let capture = { id: `cap_mock_${booking._id}`, status: 'captured' };
        if (booking.paymentProvider !== 'razorpay_mock' && !RAZORPAY_MOCK_MODE) {
            capture = await razorpayRequest('POST', `/v1/payments/${encodeURIComponent(booking.paymentId)}/capture`, { amount: toPaise(booking.totalPrice || booking.price), currency: 'INR' });
        }
        booking.paymentStatus = 'Captured';
        booking.paymentCaptureId = capture.id || booking.paymentId;
        booking.paymentCapturedAt = new Date();
        booking.status = 'Confirmed';
        await booking.save();
        emitRealtime('booking-payment-captured', { bookingId: booking._id, hotelName: booking.hotelName });
        res.json({ success: true, message: 'Payment captured successfully', capture, booking: decorateBookingForClient(booking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to capture payment' });
    }
});

app.post(['/api/payment/void/:bookingId', '/api/payment/release/:bookingId'], requireSession(['customer', 'guest', 'mitra', 'admin', 'assistant']), async (req, res) => {
    try {
        const bookingId = String(req.params.bookingId || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
        const filter = ['admin', 'assistant'].includes(req.session.role) ? { _id: bookingId } : { _id: bookingId, userEmail: req.session.email };
        const booking = await Booking.findOne({ ...filter, status: { $ne: 'Cancelled' } });
        if (!booking) return res.status(404).json({ success: false, message: 'Active booking not found' });
        const freeUntil = booking.freeCancellationUntil || calculateFreeCancellationUntil(booking);
        if (new Date(freeUntil).getTime() < Date.now()) return res.status(409).json({ success: false, message: 'Free cancellation window has ended' });

        booking.status = 'Cancelled';
        booking.paymentStatus = booking.paymentStatus === 'Captured' ? 'Refund Pending' : 'Authorization Released';
        booking.paymentVoidedAt = new Date();
        booking.cancelledAt = new Date();
        booking.cancellationReason = req.body.reason || 'Cancelled inside free cancellation window - zero deduction';
        booking.autoReleased = false;
        await booking.save();
        emitRealtime('booking-cancelled', { bookingId: booking._id, hotelName: booking.hotelName, noFee: true });
        res.json({ success: true, message: 'Booking cancelled with 100% zero-deduction release', noFee: true, booking: decorateBookingForClient(booking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to release authorization' });
    }
});

app.post('/api/bookings/:id/verify-pass', verifyAdminOrAssistant('manageBookings'), async (req, res) => {
    try {
        const bookingId = String(req.params.id || '').trim();
        const token = String(req.body.token || req.query.token || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
        if (!token) return res.status(400).json({ success: false, message: 'QR pass token is required' });

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        const pass = buildBookingPass(booking);
        if (!timingSafeEquals(token, pass.token) && !timingSafeEquals(sha256Hex(token), booking.qrPassTokenHash)) {
            return res.status(400).json({ success: false, message: 'Invalid booking pass token' });
        }
        booking.checkedIn = true;
        booking.checkedInAt = new Date();
        booking.checkedInBy = req.actor?.email || req.session?.email || 'assistant';
        booking.status = booking.status === 'Completed' ? 'Completed' : 'Confirmed';
        await booking.save();
        emitRealtime('booking-checked-in', { bookingId: booking._id, hotelName: booking.hotelName, checkedInBy: booking.checkedInBy });
        res.json({ success: true, message: 'Booking marked Checked-In', booking: buildOrderBooking(booking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Unable to verify booking pass' });
    }
});
app.get('/api/hotel/bookings', requireSession(['hotel', 'admin', 'assistant']), async (req, res) => {

    try {

        const bookings = req.session.role === 'hotel'

            ? await getBookingsForHotelSession(req)

            : await safeSortQuery(Booking.find(), { createdAt: -1 });

        res.json({ success: true, bookings: bookings.map(decorateBookingForClient) });

    } catch (err) { res.status(500).json({ success: false, message: err.message }); }

});



app.put('/api/bookings/cancel/:id', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {

    try {

        const bookingId = mongoSanitize.sanitize(String(req.params.id || ''));

        const userEmail = req.session.email;



        if (!mongoose.Types.ObjectId.isValid(bookingId)) {

            return res.status(400).json({ success: false, message: 'Valid booking ID is required' });

        }

        if (!userEmail) {

            return res.status(400).json({ success: false, message: 'Customer email is required' });

        }



        const cancelledBooking = await Booking.findOneAndUpdate(

            { _id: bookingId, userEmail, status: { $ne: 'Cancelled' } },

            {

                status: 'Cancelled',

                cancellationReason: 'Cancelled by customer',

                cancelledAt: new Date(),

                autoReleased: false

            },

            { new: true }

        );



        if (!cancelledBooking) {

            return res.status(404).json({ success: false, message: 'Active booking not found for this customer' });

        }



        await sendBookingCancellationAlert(cancelledBooking, cancelledBooking.cancellationReason);

        emitRealtime('booking-cancelled', { bookingId: cancelledBooking._id, hotelName: cancelledBooking.hotelName });

        res.json({ success: true, message: 'Booking cancelled successfully', booking: cancelledBooking });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/api/bookings/auto-release', async (req, res) => {

    try {

        const autoReleaseSecret = process.env.AUTO_RELEASE_SECRET;

        if (!autoReleaseSecret || req.get('x-auto-release-secret') !== autoReleaseSecret) {

            return res.status(403).json({ success: false, message: 'Auto-release access denied' });

        }



        const releasedBookings = await autoReleaseBookings();

        res.json({

            success: true,

            message: `${releasedBookings.length} booking(s) auto-released`,

            releasedCount: releasedBookings.length,

            bookings: releasedBookings

        });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



if (require.main === module) {

    const autoReleaseInterval = setInterval(() => {

        autoReleaseBookings().catch((err) => console.error('Auto-release error:', err));

    }, 15 * 60 * 1000);

    autoReleaseInterval.unref();

}




app.patch('/api/bookings/:id/assign-mitra', verifyAdminOrAssistant('manageBookings'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
        }

        let mitra = null;
        const requestedMitraId = String(req.body.mitraId || '').trim();
        if (requestedMitraId && mongoose.Types.ObjectId.isValid(requestedMitraId)) {
            mitra = await User.findOne({ _id: requestedMitraId, role: 'mitra', isLocked: { $ne: true } }).select('_id name fullName email');
        }
        if (!mitra) {
            mitra = await User.findOne(mitraUserFilter).where({ isLocked: { $ne: true } }).sort({ experience: -1 }).select('_id name fullName email');
        }
        if (!mitra) return res.status(404).json({ success: false, message: 'No active Mitra available for assignment' });

        const booking = await Booking.findByIdAndUpdate(req.params.id, {
            $set: {
                assignedMitra: mitra.fullName || mitra.name || mitra.email,
                assignedMitraId: mitra._id,
                mitraEmail: mitra.email,
                assignmentStatus: 'assigned',
                'selectedAddons.mitraAssistance.selected': true,
                'selectedAddons.mitraAssistance.status': 'assigned'
            }
        }, { new: true });

        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        await logActivity('UPDATE', 'Booking', booking._id, booking.hotelName, req.actor?.email || req.session?.email, req.actor?.role || req.session?.role || 'system', { assignedMitra: booking.assignedMitra });
        emitRealtime('booking-updated', { booking, updatedBy: req.actor?.email || req.session?.email, action: 'mitra-assigned' });
        res.json({ success: true, message: 'Mitra assigned successfully', booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
app.get('/admin/bookings', verifyAdmin, async (req, res) => {

    try {

        const bookings = await Booking.find().sort({ createdAt: -1 });

        res.json({ success: true, bookings: bookings.map(decorateBookingForClient) });

    } catch (err) {

        console.error('Admin bookings fetch error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/admin/bookings', verifyAdmin, async (req, res) => {

    try {

        const validationError = validateBookingPayload(req.body);

        if (validationError) return res.status(400).json({ success: false, message: validationError });



        const booking = new Booking(req.body);

        await booking.save();

        await logActivity('CREATE', 'Booking', booking._id, booking.hotelName, req.actor.email, 'admin', {

            userEmail: booking.userEmail,

            status: booking.status

        });

        emitRealtime('new-booking', { booking, createdBy: req.actor.email, actorRole: 'admin' });

        res.status(201).json({ success: true, message: 'Booking created successfully', booking });

    } catch (err) {

        console.error('Admin booking create error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/admin/bookings/:id', verifyAdmin, async (req, res) => {

    try {

        const bookingId = mongoSanitize.sanitize(String(req.params.id || ''));

        const booking = await Booking.findByIdAndUpdate(

            bookingId,

            { ...req.body, updatedAt: new Date() },

            { new: true, runValidators: true }

        );



        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });



        await logActivity('UPDATE', 'Booking', booking._id, booking.hotelName, req.actor.email, 'admin', req.body);

        emitRealtime('booking-updated', { booking, updatedBy: req.actor.email, actorRole: 'admin' });

        res.json({ success: true, message: 'Booking updated successfully', booking });

    } catch (err) {

        console.error('Admin booking update error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



app.delete('/admin/bookings/:id', verifyAdmin, async (req, res) => {

    try {

        const bookingId = mongoSanitize.sanitize(String(req.params.id || ''));

        const booking = await Booking.findByIdAndDelete(bookingId);

        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });



        await logActivity('DELETE', 'Booking', booking._id, booking.hotelName, req.actor.email, 'admin', {

            userEmail: booking.userEmail,

            status: booking.status

        });

        emitRealtime('booking-deleted', { bookingId, hotelName: booking.hotelName, deletedBy: req.actor.email });

        res.json({ success: true, message: 'Booking deleted successfully' });

    } catch (err) {

        console.error('Admin booking delete error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/all-bookings', requireSession(['admin', 'assistant', 'hotel', 'mitra', 'guest', 'customer']), async (req, res) => {

    try {

        let filter = {};

        if (req.session.enterpriseRole === 'customer' && req.session.role !== 'mitra') {

            const user = await User.findOne({ email: req.session.email }).select('_id');

            filter = user ? { $or: [{ userId: user._id }, { userEmail: req.session.email }] } : { userEmail: req.session.email };

        }

        if (req.session.role === 'mitra') {

            const mitra = await User.findOne({ email: req.session.email }).select('_id name email');

            filter = mitra

                ? { $or: [{ mitraEmail: mitra.email }, { assignedMitra: mitra.email }, { assignedMitra: mitra.name }, { assignedMitraId: mitra._id }] }

                : { mitraEmail: req.session.email };

        }

        if (req.session.role === 'hotel') {

            const hotel = await Hotel.findOne({ ownerEmail: req.session.email }).select('_id hotelName');

            filter = hotel ? { $or: [{ hotelId: hotel._id }, { hotelName: hotel.hotelName }] } : { _id: null };

        }

        res.json(await safeSortQuery(Booking.find(filter), { createdAt: -1 }));

    } catch (err) { res.status(500).send(err.message); }

});



// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â GET MITRA ASSIGNED BOOKINGS

app.get('/mitra-bookings/:mitraEmail', requireSession(['mitra', 'admin', 'assistant']), async (req, res) => {

    try {

        if (req.session.role === 'mitra' && normalizeEmail(req.params.mitraEmail) !== req.session.email) {

            return res.status(403).json({ success: false, message: 'Access denied' });

        }

        const mitra = await User.findOne({ email: normalizeEmail(req.params.mitraEmail) }).select('_id name email');

        const bookings = await safeSortQuery(Booking.find({

            $or: mitra

                ? [{ assignedMitraId: mitra._id }, { assignedMitra: mitra.email }, { assignedMitra: mitra.name }, { mitraEmail: mitra.email }]

                : [{ assignedMitra: req.params.mitraEmail }, { mitraEmail: req.params.mitraEmail }]

        }), { createdAt: -1 });

        res.json({ success: true, bookings: bookings.map(decorateBookingForClient) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/update-booking-status', requireSession(['hotel', 'admin', 'assistant']), async (req, res) => {

    try {

        const { bookingId, status, userName, userEmail, hotelName, roomType, checkIn, checkOut } = req.body;

        if (!bookingId) {

            return res.status(400).json({ success: false, message: 'Booking ID is required' });

        }



        const updateData = {};

        if (status !== undefined) updateData.status = status;

        if (userName !== undefined) updateData.userName = userName;

        if (userEmail !== undefined) updateData.userEmail = userEmail;

        if (hotelName !== undefined) updateData.hotelName = hotelName;

        if (roomType !== undefined) updateData.roomType = roomType;

        if (checkIn !== undefined) updateData.checkIn = checkIn;

        if (checkOut !== undefined) updateData.checkOut = checkOut;



        const filter = { _id: bookingId };

        if (req.session.role === 'hotel') {

            const hotel = await Hotel.findOne({ ownerEmail: req.session.email }).select('_id hotelName');

            if (!hotel) return res.status(403).json({ success: false, message: 'Hotel account not found' });

            filter.$or = [{ hotelId: hotel._id }, { hotelName: hotel.hotelName }];

        }



        const updatedBooking = await Booking.findOneAndUpdate(filter, updateData, { new: true });

        if (!updatedBooking) {

            return res.status(404).json({ success: false, message: 'Booking not found' });

        }



        emitRealtime('booking-updated', { bookingId: updatedBooking._id, hotelName: updatedBooking.hotelName, status: updatedBooking.status });

        res.status(200).json({ success: true, message: "Booking Updated", booking: updatedBooking });

    } catch (err) { res.status(500).send(err.message); }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ASSISTANT MANAGEMENT SYSTEM (Admin Control) ---

// ---------------------------------------------------------



// Create a new Assistant

app.post('/admin/create-assistant', verifyAdmin, async (req, res) => {

    try {

        const { email, password, name, role, permissions } = req.body;

        const cleanEmail = String(email || '').trim().toLowerCase();

        const cleanName = String(name || '').trim();

        const cleanPassword = String(password || '').trim();

        const cleanRole = ['assistant', 'manager'].includes(role) ? role : 'assistant';



        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ADMIN ONLY - Assistants cannot create assistants

        if (req.actor?.role !== 'admin') {

            return res.status(403).json({ success: false, message: 'Only Admin can create assistants' });

        }



        if (!cleanName || !cleanEmail || !cleanPassword) {

            return res.status(400).json({ success: false, message: 'Name, email and password are required' });

        }

        if (!isValidEmail(cleanEmail) || !isStrongEnoughPassword(cleanPassword)) {

            return res.status(400).json({ success: false, message: 'Enter a valid email and a password of at least 8 characters' });

        }



        // Check if assistant already exists

        const existingAssistant = await Assistant.findOne({ email: cleanEmail });

        if (existingAssistant) {

            return res.status(400).json({ success: false, message: 'Assistant email already exists' });

        }



        const newAssistant = new Assistant({

            name: cleanName,

            email: cleanEmail,

            password: cleanPassword,

            role: cleanRole,

            permissions: {

                manageHotels: true,

                manageCustomers: true,

                manageMitra: true,
                manageMitras: true,

                manageBookings: false,

                viewReports: false,
                manageHeritage: true,
                manageSettings: true,

                ...(permissions || {})

            },

            createdBy: req.actor.email

        });



        await newAssistant.save();



        // Log activity

        await logActivity('CREATE', 'Assistant', newAssistant._id, cleanName, req.actor.email, 'admin');

        emitRealtime('assistant-created', { assistantId: newAssistant._id, name: newAssistant.name, email: newAssistant.email, createdBy: req.actor.email });



        return res.status(201).json({

            success: true,

            message: 'Assistant created successfully',

            assistant: {

                _id: newAssistant._id,

                name: newAssistant.name,

                email: newAssistant.email,

                role: newAssistant.role

            }

        });

    } catch (err) {

        console.error('Create assistant error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Assistant ground-operations APIs
const normalizeAssistantPaymentStatus = (booking) => {
    const raw = String(booking?.paymentStatus || '').toLowerCase();
    return /paid|online|success|complete/.test(raw) ? 'Online Paid' : 'Cash on Arrival';
};

const normalizeAssistantBookingProgress = (booking) => {
    if (booking?.status === 'Cancelled') return 'Cancelled';
    if (booking?.status === 'Completed') return 'Completed';
    if (booking?.checkedIn) return 'Checked-In';
    if (booking?.status === 'Confirmed') return 'Hotel Accepted';
    return 'Pending';
};

const bookingProgressToUpdate = (progress) => {
    const value = String(progress || '').trim();
    if (value === 'Hotel Accepted') return { status: 'Confirmed', checkedIn: false };
    if (value === 'Checked-In') return { status: 'Confirmed', checkedIn: true };
    if (value === 'Completed') return { status: 'Completed', checkedIn: true };
    if (value === 'Cancelled') return { status: 'Cancelled', checkedIn: false, cancelledAt: new Date(), cancellationReason: 'Cancelled by assistant operations' };
    return { status: 'Pending', checkedIn: false };
};

const buildAssistantBooking = (booking) => ({
    _id: booking._id,
    customerName: booking.userName,
    customerEmail: booking.userEmail,
    hotelName: booking.hotelName,
    hotelId: booking.hotelId,
    roomType: booking.roomType,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    paymentStatus: normalizeAssistantPaymentStatus(booking),
    rawPaymentStatus: booking.paymentStatus,
    progress: normalizeAssistantBookingProgress(booking),
    status: booking.status,
    checkedIn: booking.checkedIn,
    totalPrice: booking.totalPrice || booking.price,
    createdAt: booking.createdAt
});

const normalizeOrderPaymentMode = (booking) => {
    const raw = String(booking?.paymentStatus || '').toLowerCase();
    return /paid|online|success|complete/.test(raw) ? 'Online Paid' : 'Cash at Hotel';
};

const normalizeOrderStatus = (booking) => {
    if (booking?.status === 'Completed') return 'Completed';
    if (booking?.status === 'Confirmed' || booking?.checkedIn) return 'Accepted';
    return 'Pending';
};

const buildOrderBooking = (booking) => ({
    _id: booking._id,
    customerName: booking.userName,
    userName: booking.userName,
    userEmail: booking.userEmail,
    hotelBooked: booking.hotelName,
    hotelName: booking.hotelName,
    roomType: booking.roomType,
    paymentMode: normalizeOrderPaymentMode(booking),
    paymentStatus: booking.paymentStatus,
    paymentProvider: booking.paymentProvider,
    paymentOrderId: booking.paymentOrderId,
    paymentId: booking.paymentId,
    bookingReference: createBookingReference(booking),
    bookingPass: buildBookingPass(booking),
    freeCancellationUntil: booking.freeCancellationUntil,
    checkedIn: booking.checkedIn,
    checkedInAt: booking.checkedInAt,
    status: normalizeOrderStatus(booking),
    selectedAddons: booking.selectedAddons || {},
    guestDetails: booking.guestDetails || {},
    pricingBreakdown: booking.pricingBreakdown || {},
    assignedMitra: booking.assignedMitra,
    assignedMitraId: booking.assignedMitraId,
    mitraEmail: booking.mitraEmail,
    assignmentStatus: booking.assignmentStatus,
    totalPrice: booking.totalPrice,
    price: booking.price,
    createdAt: booking.createdAt
});

const buildComplaintHotelQuery = (hotel) => {
    const terms = [hotel?._id, hotel?.hotelName, hotel?.ownerEmail].filter(Boolean).map((value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!terms.length) return null;
    const pattern = new RegExp(terms.join('|'), 'i');
    return { $or: [{ subject: pattern }, { description: pattern }, { assignedTo: pattern }] };
};

const getHotelComplaintCount = async (hotel) => {
    const query = buildComplaintHotelQuery(hotel);
    return query ? SupportTicket.countDocuments(query) : 0;
};

app.get(['/api/assistants/dashboard-stats', '/api/reports'], verifyAssistantToken(), async (req, res) => {
    try {
        const [totalHotels, totalBookings, confirmedBookings, pendingBookings, totalCustomers, activeMitras, totalComplaints] = await Promise.all([
            Hotel.countDocuments(),
            Booking.countDocuments(),
            Booking.countDocuments({ status: 'Confirmed' }),
            Booking.countDocuments({ status: 'Pending' }),
            Enquiry.countDocuments(),
            User.countDocuments(mitraUserFilter),
            SupportTicket.countDocuments({ status: { $nin: ['resolved', 'closed'] } })
        ]);
        const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
        const recentEnquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(5);
        res.json({
            success: true,
            stats: { totalHotels, totalBookings, confirmedBookings, pendingBookings, totalCustomers, activeMitras, totalComplaints, pendingTasks: pendingBookings + totalComplaints },
            recentBookings,
            recentEnquiries
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/assistants/bookings', verifyAssistantToken(), async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 }).limit(300);
        res.json({ success: true, bookings: bookings.map(buildAssistantBooking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get(['/api/assistants/orders-bookings', '/admin/orders-bookings'], verifyAdminOrAssistant('manageBookings'), async (req, res) => {
    try {
        const bookings = await Booking.find({ status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 }).limit(300);
        res.json({ success: true, bookings: bookings.map(buildOrderBooking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/assistants/bookings/:id/progress', verifyAssistantToken(), async (req, res) => {
    try {
        const bookingId = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
        const progress = ['Pending', 'Hotel Accepted', 'Checked-In', 'Completed', 'Cancelled'].includes(req.body.progress) ? req.body.progress : 'Pending';
        const booking = await Booking.findByIdAndUpdate(bookingId, bookingProgressToUpdate(progress), { new: true, runValidators: true });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        await logActivity('UPDATE', 'Booking', booking._id, booking.hotelName, req.actor.email, 'assistant', { progress, status: booking.status, checkedIn: booking.checkedIn });
        emitRealtime('booking-progress-updated', { bookingId: booking._id, hotelName: booking.hotelName, progress, updatedBy: req.actor.email });
        res.json({ success: true, message: 'Booking progress updated', booking: buildAssistantBooking(booking) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/assistants/complaints', verifyAssistantToken(), async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ status: { $nin: ['closed'] } }).sort({ priority: -1, updatedAt: -1 }).limit(300);
        const complaints = tickets.map((ticket) => ({
            _id: ticket._id,
            customerName: ticket.customerName,
            customerEmail: ticket.customerEmail,
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            urgency: ticket.priority,
            status: ticket.status,
            assignedTo: ticket.assignedTo,
            timeline: ticket.timeline,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt
        }));
        res.json({ success: true, complaints });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/assistants/complaints/:id/warning', verifyAssistantToken(), async (req, res) => {
    try {
        const ticketId = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(ticketId)) return res.status(400).json({ success: false, message: 'Valid complaint ID is required' });
        const note = String(req.body.note || 'Warning issued by assistant operations.').trim();
        const hotelId = String(req.body.hotelId || '').trim();
        const hotelName = String(req.body.hotelName || '').trim();
        const hotel = mongoose.Types.ObjectId.isValid(hotelId)
            ? await Hotel.findById(hotelId).select('hotelName ownerEmail')
            : hotelName
                ? await Hotel.findOne({ hotelName: hotelName }).select('hotelName ownerEmail')
                : null;
        const ticket = await SupportTicket.findByIdAndUpdate(
            ticketId,
            {
                status: 'in_progress',
                tier: 'assistant',
                assignedTo: hotel?.ownerEmail || hotelName || req.body.assignedTo || '',
                $push: { timeline: { action: 'hotel_warning_sent', note, performedBy: req.actor.email, performedByRole: 'assistant' } }
            },
            { new: true }
        );
        if (!ticket) return res.status(404).json({ success: false, message: 'Complaint not found' });
        await logActivity('SECURITY', 'Warning', ticket._id, hotel?.hotelName || ticket.subject, req.actor.email, 'assistant', {
            complaintId: ticket._id,
            hotelId: hotel?._id || null,
            hotelName: hotel?.hotelName || hotelName,
            note
        });
        emitRealtime('hotel-warning-issued', { ticketId: ticket._id, hotelId: hotel?._id || null, hotelName: hotel?.hotelName || hotelName, note, issuedBy: req.actor.email });
        res.json({ success: true, message: 'Warning sent to hotel panel and logged', complaint: ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/assistants/hotel-operations', verifyAssistantToken('manageHotels'), async (req, res) => {
    try {
        const hotels = await Hotel.find().select('-password').sort({ updatedAt: -1 }).lean();
        const gvsHotels = await enrichHotelsWithGvs(hotels);
        const enriched = await Promise.all(gvsHotels.map(async (hotel) => ({
            ...hotel,
            verificationStatus: hotel.verificationStatus || (hotel.isVerified === false ? 'Pending Verification' : 'Verified'),
            isActive: hotel.isAvailable !== false && hotel.isLocked !== true,
            complaintsCount: await getHotelComplaintCount(hotel),
            feedbackLogs: (hotel.reviews || []).slice(0, 5),
            displayRating: hotel.averageRating || hotel.rating || 0,
            gvsScore: hotel.gvs?.gvsScore || hotel.gvsScore || 0,
            gvsRankStatus: hotel.gvs?.gvsRankStatus || hotel.gvsRankStatus || 'New Property'
        })));
        res.json({ success: true, hotels: enriched });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/assistants/hotels/:id/profile', verifyAssistantToken('manageHotels'), async (req, res) => {
    try {
        const hotelId = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(hotelId)) return res.status(400).json({ success: false, message: 'Valid hotel ID is required' });
        const hotel = await Hotel.findById(hotelId).select('-password').lean();
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        const bookings = await Booking.find({ $or: [{ hotelId: hotel._id }, { hotelName: hotel.hotelName }] }).sort({ createdAt: -1 }).limit(100).lean();
        res.json({ success: true, hotel: { ...hotel, verificationStatus: hotel.verificationStatus || (hotel.isVerified === false ? 'Pending Verification' : 'Verified') }, bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/assistants/hotels/:id/verification', verifyAssistantToken('manageHotels'), async (req, res) => {
    try {
        const hotelId = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(hotelId)) return res.status(400).json({ success: false, message: 'Valid hotel ID is required' });
        const action = String(req.body.action || '').trim().toLowerCase();
        if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
        const update = action === 'approve'
            ? { isVerified: true, verificationStatus: 'Verified', isLocked: false, isAvailable: true, rejectionReason: '', verifiedBy: req.actor.email, verifiedAt: new Date(), updatedBy: req.actor.email, updatedAt: new Date() }
            : { isVerified: false, verificationStatus: 'Rejected', isLocked: true, isAvailable: false, rejectionReason: String(req.body.reason || 'KYC verification rejected by assistant.').trim(), verifiedBy: req.actor.email, verifiedAt: new Date(), updatedBy: req.actor.email, updatedAt: new Date() };
        const result = await Hotel.collection.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(hotelId) },
            { $set: update },
            { returnDocument: 'after', projection: { password: 0 } }
        );
        const hotel = result?.value || result;
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        await logActivity(action === 'approve' ? 'APPROVE' : 'REJECT', 'Hotel', hotel._id, hotel.hotelName, req.actor.email, 'assistant', { verificationStatus: update.verificationStatus, reason: update.rejectionReason || '' });
        emitRealtime('hotel-verification-updated', { hotelId: hotel._id, hotelName: hotel.hotelName, verificationStatus: update.verificationStatus, updatedBy: req.actor.email });
        res.json({ success: true, message: `Hotel ${action === 'approve' ? 'approved' : 'rejected'} successfully`, hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/assistants/hotels/:id/active', verifyAssistantToken('manageHotels'), async (req, res) => {
    try {
        const hotelId = String(req.params.id || '').trim();
        if (!mongoose.Types.ObjectId.isValid(hotelId)) return res.status(400).json({ success: false, message: 'Valid hotel ID is required' });
        const isActive = req.body.isActive === true;
        const hotel = await Hotel.findByIdAndUpdate(
            hotelId,
            { isAvailable: isActive, isLocked: !isActive, updatedBy: req.actor.email, updatedAt: new Date() },
            { new: true }
        ).select('-password');
        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });
        await logActivity('TOGGLE_STATUS', 'Hotel', hotel._id, hotel.hotelName, req.actor.email, 'assistant', { isActive, isAvailable: hotel.isAvailable, isLocked: hotel.isLocked });
        emitRealtime('hotel-active-status-updated', { hotelId: hotel._id, hotelName: hotel.hotelName, isActive, updatedBy: req.actor.email });
        res.json({ success: true, message: `Hotel ${isActive ? 'activated' : 'inactivated'} successfully`, hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Assistant Login

app.post(['/assistant-login', '/assistant/login', '/api/assistant-login', '/api/assistant/login', '/api/assistants/login', '/api/auth/assistant-login'], async (req, res) => {

    try {

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const email = body.email || body.assistantEmail || body.username || '';
        const password = body.password || '';
        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) {

            return res.status(401).json({ success: false, message: 'Invalid assistant credentials' });

        }

        let assistant;

        try {

            await waitForAssistantLoginDatabase(5000);

            assistant = await withDatabaseTimeout(
                Assistant.findOne({ email: normalizedEmail }).maxTimeMS(5000).exec(),
                5000,
                'Assistant login lookup timed out'
            );

            const passwordMatches = assistant && await assistant.comparePassword(password);

            if (!assistant || !passwordMatches || !assistant.isActive) {

                return res.status(401).json({ success: false, message: 'Invalid assistant credentials' });

            }

        } catch (err) {

            console.error('ASSISTANT LOGIN DB ERROR:', err);

            return res.status(503).json({ success: false, message: 'Assistant login is temporarily unavailable while the database reconnects. Please try again shortly.' });

        }

        assistant.lastLogin = new Date();

        await assistant.save().catch((err) => console.error('ASSISTANT LOGIN CRASH:', err));

        const permissions = normalizeAssistantPermissions(assistant.permissions || {});
        const sessionToken = createSessionToken('assistant', assistant.email, '8h', {
            id: String(assistant._id),
            permissions
        });

        res.status(200).json({

            success: true,

            message: 'Assistant login successful',

            sessionToken,
            token: sessionToken,

            assistant: {

                _id: assistant._id,

                name: assistant.name,

                email: assistant.email,

                role: 'assistant',

                permissions

            }

        });

    } catch (err) {

        console.error('ASSISTANT LOGIN CRASH:', err);

        res.status(401).json({ success: false, message: 'Invalid assistant credentials' });

    }

});



// Get all assistants (Admin only)

app.get('/admin/all-assistants', verifyAdmin, async (req, res) => {

    try {

        const assistants = await Assistant.find().select('-password');

        res.json({ success: true, assistants });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get(['/admin/all-hotels', '/api/assistants/all-hotels'], verifyAdminOrAssistant('manageHotels'), async (req, res) => {

    try {

        const hotels = await Hotel.find().select('-password');
        const rankedHotels = await enrichHotelsWithGvs(hotels);

        res.json({ success: true, hotels: rankedHotels });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get(['/admin/all-customers', '/api/assistants/customers'], verifyAdminOrAssistant('manageCustomers'), async (req, res) => {

    try {

        const registeredCustomers = await User.find({ role: 'customer', $or: [{ experience: '' }, { experience: { $exists: false } }] })

            .select(publicUserFields)

            .sort({ date: -1 });

        const enquiryCustomers = await Enquiry.find().sort({ createdAt: -1 });

        const customers = [

            ...registeredCustomers.map((customer) => ({

                ...buildSafeUserProfile(customer),

                customerName: customer.fullName || customer.name,

                customerEmail: customer.email,

                customerPhone: customer.phone,

                source: 'registered'

            })),

            ...enquiryCustomers.map((enquiry) => ({

                _id: enquiry._id,

                customerName: enquiry.customerName,

                customerEmail: enquiry.customerEmail,

                customerPhone: enquiry.customerPhone,

                status: enquiry.status,

                isLocked: enquiry.isLocked,

                source: 'enquiry',

                createdAt: enquiry.createdAt

            }))

        ];

        res.json({ success: true, customers });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/api/assistants/mitras/kyc-docs/:filename', verifyAssistantToken('manageMitra'), (req, res) => {
    const safeFileName = path.basename(String(req.params.filename || '').replace(/\0/g, ''));
    if (!safeFileName || safeFileName === '.' || safeFileName === '..' || safeFileName.includes('..')) {
        return res.status(400).json({ success: false, message: 'Invalid file name' });
    }

    const kycDocsDir = isVercelServerless
        ? path.join('/tmp', 'gyangarbh-uploads', 'kyc-docs')
        : path.join(__dirname, 'uploads', 'kyc-docs');
    const filePath = path.resolve(kycDocsDir, safeFileName);

    if (!filePath.startsWith(path.resolve(kycDocsDir) + path.sep)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!safePathExists(filePath)) {
        return res.status(404).json({ success: false, message: 'KYC document not found' });
    }

    return res.sendFile(filePath);
});
app.patch('/api/assistants/mitras/:id/verify', verifyAssistantToken('manageMitra'), async (req, res) => {
    try {
        const requestedStatus = String(req.body.kycStatus || req.body.status || req.body.action || '').trim();
        const normalizedStatus = /^(approve|approved|verify|verified)$/i.test(requestedStatus) ? 'Verified' : /^(reject|rejected)$/i.test(requestedStatus) ? 'Rejected' : requestedStatus;
        if (!MITRA_KYC_STATUS_VALUES.includes(normalizedStatus) || normalizedStatus === 'Pending Verification') {
            return res.status(400).json({ success: false, message: 'kycStatus must be Verified or Rejected.' });
        }
        const reviewNotes = String(req.body.notes || req.body.reason || '').trim();
        const mitra = await User.findByIdAndUpdate(req.params.id, {
            kycStatus: normalizedStatus,
            kycReviewerNotes: reviewNotes,
            kycReviewedBy: req.actor?.email || '',
            kycReviewedAt: new Date(),
            updatedBy: req.actor?.email || '',
            updatedAt: new Date()
        }, { new: true, strict: false }).select('-password');
        if (!mitra) return res.status(404).json({ success: false, message: 'Mitra not found' });
        await MitraKyc.findOneAndUpdate(
            { mitra: req.params.id },
            {
                $set: {
                    status: normalizedStatus === 'Verified' ? 'verified' : 'rejected',
                    rejectionReason: normalizedStatus === 'Rejected' ? reviewNotes : '',
                    reviewRemarks: reviewNotes,
                    reviewedBy: req.actor?.email || '',
                    reviewedAt: new Date()
                }
            },
            { new: true, strict: false }
        ).catch(() => null);
        await logActivity('UPDATE', 'Mitra', mitra._id, mitra.name || mitra.fullName, req.actor?.email, req.actor?.role || 'assistant', { kycStatus: normalizedStatus });
        emitRealtime('mitra-kyc-updated', { mitra, kycStatus: normalizedStatus, reviewedBy: req.actor?.email });
        res.json({ success: true, message: `Mitra KYC ${normalizedStatus.toLowerCase()}`, mitra });
    } catch (err) {
        console.error('Error verifying mitra KYC:', err);
        res.status(500).json({ success: false, message: 'Error verifying mitra KYC' });
    }
});
app.get(['/admin/all-mitras', '/api/assistants/mitras'], verifyAdminOrAssistant('manageMitra'), async (req, res) => {

    try {

        const mitras = await User.find(mitraUserFilter).select('-password').lean();
        const mitraIds = mitras.map((mitra) => mitra._id);
        const kycApplications = mitraIds.length ? await MitraKyc.find({ mitra: { $in: mitraIds } }).lean() : [];
        const kycByMitra = new Map(kycApplications.map((kyc) => [String(kyc.mitra), kyc]));
        const statusLabels = { pending: 'Pending Verification', verified: 'Verified', rejected: 'Rejected', resubmission_required: 'Rejected' };
        const mitrasWithKyc = mitras.map((mitra) => {
            const kyc = kycByMitra.get(String(mitra._id)) || null;
            const documents = (kyc?.documents || []).map((doc) => ({
                ...doc,
                url: `/api/assistants/mitras/kyc-docs/${encodeURIComponent(doc.filename)}`
            }));
            return {
                ...mitra,
                kycStatus: mitra.kycStatus || statusLabels[kyc?.status] || 'Not Submitted',
                kycApplication: kyc ? { ...kyc, documents } : null
            };
        });

        res.json({ success: true, mitras: mitrasWithKyc });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/admin/staff', verifyAdminOrAssistant('viewReports'), async (req, res) => {

    try {

        const staff = await User.find({ role: { $in: STAFF_ROLES } }).select(publicUserFields).sort({ date: -1 });

        res.json({ success: true, staff: staff.map(buildSafeUserProfile) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/admin/staff', verifyAdmin, async (req, res) => {

    try {

        const { fullName, name, email, phone, password, role, dob, villageCity, pinCode, profilePic } = req.body;

        const cleanRole = STAFF_ROLES.includes(role) ? role : 'support';

        const cleanEmail = normalizeEmail(email);

        if (!cleanEmail || !isValidEmail(cleanEmail) || !password || !(fullName || name)) {

            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });

        }

        const existing = await User.findOne({ email: cleanEmail });

        if (existing) return res.status(400).json({ success: false, message: 'Staff email already exists' });



        const staff = new User({

            name: fullName || name,

            fullName: fullName || name,

            email: cleanEmail,

            phone: normalizePhone(phone),

            password,

            role: cleanRole,

            supportTier: cleanRole === 'support' ? 'tier1' : cleanRole === 'specialist' ? 'specialist' : 'none',

            dob: parseDob(dob),

            villageCity: villageCity || '',

            address: villageCity || '',

            pinCode: pinCode || '',

            profilePic: profilePic || ''

        });

        await staff.save();

        await logActivity('CREATE', 'Staff', staff._id, staff.fullName, req.actor.email, 'admin', { role: cleanRole });

        res.status(201).json({ success: true, message: 'Staff created successfully', staff: buildSafeUserProfile(staff) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/admin/staff/:id', verifyAdminOrAssistant('manageCustomers'), async (req, res) => {

    try {

        const updateData = {};

        ['fullName', 'name', 'phone', 'villageCity', 'pinCode', 'profilePic', 'supportTier', 'isLocked'].forEach((key) => {

            if (req.body[key] !== undefined) updateData[key] = req.body[key];

        });

        if (updateData.fullName && !updateData.name) updateData.name = updateData.fullName;

        if (updateData.villageCity) updateData.address = updateData.villageCity;

        updateData.updatedAt = new Date();

        const staff = await User.findOneAndUpdate(

            { _id: req.params.id, role: { $in: STAFF_ROLES } },

            updateData,

            { new: true, runValidators: true }

        ).select(publicUserFields);

        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

        res.json({ success: true, message: 'Staff updated successfully', staff: buildSafeUserProfile(staff) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



// Update Assistant Details

app.put('/admin/update-assistant', verifyAdmin, async (req, res) => {

    try {

        const { assistantId, name, email, role, permissions, isActive } = req.body;



        const updatedAssistant = await Assistant.findByIdAndUpdate(

            assistantId,

            {

                name,

                email,

                role,

                permissions: permissions || {},

                isActive

            },

            { new: true }

        ).select('-password');



        if (!updatedAssistant) {

            return res.status(404).json({ success: false, message: 'Assistant not found' });

        }

        await logActivity('UPDATE', 'Assistant', assistantId, updatedAssistant.name, req.actor.email, 'admin', { email, role, permissions, isActive });

        emitRealtime('assistant-updated', { assistant: updatedAssistant, updatedBy: req.actor.email });



        res.json({

            success: true,

            message: 'Assistant updated successfully',

            assistant: updatedAssistant

        });

    } catch (err) {

        console.error('Update assistant error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Delete Assistant (Admin only)

app.delete('/admin/delete-assistant', verifyAdmin, async (req, res) => {

    try {

        const { assistantId, deletedBy, deletedByRole } = req.body;
        const primaryAdminEmail = 'sirsonu122@gmail.com';



        // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ADMIN ONLY - Assistants cannot delete other assistants

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({

                success: false,

                message: 'Only Admin can delete assistants permanently'

            });

        }



        const assistant = await Assistant.findById(assistantId);

        if (!assistant) {

            return res.status(404).json({ success: false, message: 'Assistant not found' });

        }

        const isPrimaryAdmin = assistant.role === 'admin' || String(assistant.email || '').trim().toLowerCase() === primaryAdminEmail;

        if (isPrimaryAdmin) {

            return res.status(403).json({ success: false, message: 'Primary Admin account cannot be deleted.' });

        }

        const deletedAssistant = await Assistant.findByIdAndDelete(assistantId);



        if (!deletedAssistant) {

            return res.status(404).json({ success: false, message: 'Assistant not found' });

        }



        await ActivityLog.deleteMany({ $or: [

            { entityType: 'Assistant', entityId: assistantId },

            { performedBy: deletedAssistant.email }

        ] });



        await logActivity('DELETE', 'Assistant', assistantId, deletedAssistant.name, deletedBy || req.actor?.email, deletedByRole || req.actor?.role);

        emitRealtime('assistant-deleted', { assistantId, name: deletedAssistant.name, deletedBy: deletedBy || req.actor?.email });



        res.json({ success: true, message: 'Assistant deleted successfully and related audit records cleaned up' });

    } catch (err) {

        console.error('Delete assistant error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â BODHI PATH - SPIRITUAL & HERITAGE SYSTEM ---

// ---------------------------------------------------------



// Get all Bodhi Path entries (for frontend display)

app.get('/bodhi-path/all', async (req, res) => {

    try {

        await ensureDefaultBodhiPathData();
        const bodhiPaths = await BodhiPath.find();

        res.json({ success: true, bodhiPaths });

    } catch (err) {

        console.error('Error fetching Bodhi Path:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Admin fetch all Bodhi Path entries

app.get('/admin/all-bodhi-paths', verifyAdminOrAssistant('manageHeritage'), async (req, res) => {

    try {

        const bodhiPaths = await BodhiPath.find();

        res.json({ success: true, bodhiPaths });

    } catch (err) {

        console.error('Error fetching admin bodhi paths:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});





app.get('/api/bodhi-path', async (req, res) => {
    const fallbackBodhiPath = DEFAULT_BODHI_PATH_SITES.map((site, index) => ({ ...site, _id: 'fallback-bodhi-path-' + (index + 1), isLocked: false, createdAt: new Date(), updatedAt: new Date() }));

    try {
        const items = await withDatabaseTimeout((async () => {
            await ensureDefaultBodhiPathData();
            return BodhiPath.find({ status: { $ne: 'Inactive' } })
                .sort({ createdAt: -1 })
                .maxTimeMS(3000)
                .exec();
        })(), 3000, 'Bodhi Path query timed out after 3000ms');

        res.json({ success: true, data: items, bodhiPaths: items });
    } catch (err) {
        if (!/timed out|timeout|buffering timed out|server selection/i.test(err?.message || '')) {
            console.warn('Bodhi Path fallback served after database error:', err.message);
        }
        res.status(200).json({
            success: true,
            count: fallbackBodhiPath.length,
            data: fallbackBodhiPath,
            heritage: fallbackBodhiPath,
            bodhiPaths: fallbackBodhiPath,
            temples: fallbackBodhiPath,
            message: 'Bodhi Path catalog temporarily unavailable. Showing fallback data.'
        });
    }
});
app.get('/api/heritage', async (req, res) => {
    const fallbackHeritage = DEFAULT_BODHI_PATH_SITES.map((site, index) => ({ ...site, _id: 'fallback-heritage-' + (index + 1), isLocked: false, createdAt: new Date(), updatedAt: new Date() }));

    try {
        const session = ensureVerifiedSession(req);
        const isManager = session && ['admin', 'assistant', 'mitra'].includes(session.role);
        const includeInactive = req.query.includeInactive === 'true' && isManager;
        const filter = includeInactive ? {} : { status: { $ne: 'Inactive' }, isLocked: { $ne: true } };

        const data = await withDatabaseTimeout((async () => {
            await ensureDefaultBodhiPathData();
            return BodhiPath.find(filter)
                .sort({ updatedAt: -1, createdAt: -1 })
                .maxTimeMS(3000)
                .exec();
        })(), 3000, 'Heritage query timed out after 3000ms');

        res.json({ success: true, count: data.length, data, heritage: data, bodhiPaths: data, temples: data });
    } catch (err) {
        if (!/timed out|timeout|buffering timed out|server selection/i.test(err?.message || '')) {
            console.warn('Heritage fallback served after database error:', err.message);
        }
        res.status(200).json({
            success: true,
            count: fallbackHeritage.length,
            data: fallbackHeritage,
            heritage: fallbackHeritage,
            bodhiPaths: fallbackHeritage,
            temples: fallbackHeritage,
            message: 'Heritage catalog temporarily unavailable. Showing fallback data.'
        });
    }
});
app.post('/api/heritage', verifyHeritageManager, async (req, res) => {
    try {
        const payload = buildHeritagePayload(req.body);
        if (!payload.title) return res.status(400).json({ success: false, message: 'Name is required', data: null });
        payload.createdAt = new Date();
        payload.updatedAt = new Date();
        payload.updatedBy = req.actor.email;
        payload.auditLogs = [heritageAudit(req.actor, 'CREATE', req.body.changes || 'Created heritage entry')];
        const data = await BodhiPath.create(payload);
        await logActivity('CREATE', 'BodhiPath', data._id, data.title, req.actor.email, req.actor.role, payload);
        await createSystemNotification({ title: 'Bodhi Path Created', message: `${req.actor.name || req.actor.email} created ${data.title}`, type: 'heritage-created', entityType: 'BodhiPath', entityId: data._id, audience: ['admin', 'assistant', 'mitra'], createdBy: req.actor.email });
        emitRealtime('bodhi-path-created', { bodhiPath: data, createdBy: req.actor.email, actorName: req.actor.name, actorRole: req.actor.role });
        res.status(201).json({ success: true, message: 'Heritage entry created successfully', data, heritage: data, bodhiPath: data });
    } catch (err) {
        console.error('Create heritage error:', err);
        res.status(500).json({ success: false, message: 'Unable to create heritage entry', error: err.message, data: null });
    }
});

app.put('/api/heritage/:id', verifyHeritageManager, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid heritage ID is required', data: null });
        const payload = buildHeritagePayload(req.body);
        if (!payload.title) return res.status(400).json({ success: false, message: 'Name is required', data: null });
        payload.updatedAt = new Date();
        payload.updatedBy = req.actor.email;
        const audit = heritageAudit(req.actor, req.body.auditAction || 'UPDATE', req.body.changes || 'Updated heritage entry');
        const data = await BodhiPath.findByIdAndUpdate(req.params.id, { $set: payload, $push: { auditLogs: audit } }, { new: true, runValidators: true });
        if (!data) return res.status(404).json({ success: false, message: 'Heritage entry not found', data: null });
        await logActivity('UPDATE', 'BodhiPath', data._id, data.title, req.actor.email, req.actor.role, { changes: audit.changes, timestamp: audit.timestamp });
        await createSystemNotification({ title: 'Bodhi Path Updated', message: `${req.actor.name || req.actor.email} updated ${data.title}`, type: 'heritage-updated', entityType: 'BodhiPath', entityId: data._id, audience: ['admin', 'assistant', 'mitra'], createdBy: req.actor.email });
        emitRealtime('bodhi-path-updated', { bodhiPath: data, updatedBy: req.actor.email, actorName: req.actor.name, actorRole: req.actor.role });
        res.json({ success: true, message: 'Heritage entry updated successfully', data, heritage: data, bodhiPath: data });
    } catch (err) {
        console.error('Update heritage error:', err);
        res.status(500).json({ success: false, message: 'Unable to update heritage entry', error: err.message, data: null });
    }
});

app.delete('/api/heritage/:id', verifyHeritageManager, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid heritage ID is required', data: null });
        const audit = heritageAudit(req.actor, 'DELETE', req.body?.reason || 'Deleted from dashboard');
        const data = await BodhiPath.findByIdAndUpdate(
            req.params.id,
            { $set: { status: 'Inactive', isLocked: true, updatedBy: req.actor.email, updatedAt: new Date() }, $push: { auditLogs: audit } },
            { new: true, runValidators: true }
        );
        if (!data) return res.status(404).json({ success: false, message: 'Heritage entry not found', data: null });
        await logActivity('DELETE', 'BodhiPath', data._id, data.title, req.actor.email, req.actor.role, { reason: audit.changes, timestamp: audit.timestamp });
        await createSystemNotification({ title: 'Bodhi Path Archived', message: `${req.actor.name || req.actor.email} archived ${data.title}`, type: 'heritage-archived', entityType: 'BodhiPath', entityId: data._id, audience: ['admin', 'assistant', 'mitra'], createdBy: req.actor.email });
        emitRealtime('bodhi-path-deleted', { bodhiPathId: data._id, title: data.title, deletedBy: req.actor.email, actorName: req.actor.name, actorRole: req.actor.role });
        res.json({ success: true, message: 'Heritage entry archived successfully', data, heritage: data, bodhiPath: data });
    } catch (err) {
        console.error('Delete heritage error:', err);
        res.status(500).json({ success: false, message: 'Unable to archive heritage entry', error: err.message, data: null });
    }
});

app.get('/api/heritage/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: 'Valid heritage ID is required', data: null });
        const data = await BodhiPath.findOneAndUpdate(
            { _id: req.params.id, status: { $ne: 'Inactive' }, isLocked: { $ne: true } },
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!data) return res.status(404).json({ success: false, message: 'Heritage entry not found', data: null });
        res.json({ success: true, data, heritage: data, bodhiPath: data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Unable to load heritage entry', error: err.message, data: null });
    }
});

// Get specific Bodhi Path entry

app.get('/bodhi-path/:id', async (req, res, next) => {

    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next();

        const bodhiPath = await BodhiPath.findById(req.params.id);

        if (!bodhiPath) {

            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });

        }

        res.json({ success: true, bodhiPath });

    } catch (err) {

        console.error('Error fetching Bodhi Path:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/admin/bodhi-path/create', verifyAdminOrAssistant('manageHeritage'), async (req, res) => {

    try {

        const { title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, createdBy, createdByRole } = req.body;



        const actorEmail = req.actor?.email || createdBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || createdByRole);

        if (!actorRole) {

            return res.status(401).json({ success: false, message: 'Unauthorized access' });

        }



        const newBodhiPath = new BodhiPath({

            title,

            category,

            shortDescription,

            fullDescription,

            significance,

            historicalFacts: historicalFacts || [],

            location: location || {},

            imageUrl,

            images: images || [],

            bestTimeToVisit,

            visitingHours,

            entryFee,

            estimatedVisitTime,

            relatedTemples: relatedTemples || [],

            spiritualSignificance,

            updatedBy: actorEmail

        });



        await newBodhiPath.save();

        await logActivity('CREATE', 'BodhiPath', newBodhiPath._id, title, actorEmail, actorRole);

        emitRealtime('bodhi-path-created', { bodhiPath: newBodhiPath, createdBy: actorEmail, actorRole });

        res.status(201).json({

            success: true,

            message: 'Bodhi Path entry created successfully',

            bodhiPath: newBodhiPath

        });

    } catch (err) {

        console.error('Create Bodhi Path error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Update Bodhi Path entry (Admin/Assistant only)

app.put('/admin/bodhi-path/update', verifyAdminOrAssistant('manageHeritage'), async (req, res) => {

    try {

        const { bodhiPathId, title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, updatedBy, updatedByRole } = req.body;



        const actorEmail = req.actor?.email || updatedBy;
        const actorRole = await resolveActorRole(actorEmail, req.actor?.role || updatedByRole);

        if (!actorRole) {

            return res.status(401).json({ success: false, message: 'Unauthorized access' });

        }



        const updatedBodhiPath = await BodhiPath.findByIdAndUpdate(

            bodhiPathId,

            {

                title,

                category,

                shortDescription,

                fullDescription,

                significance,

                historicalFacts: historicalFacts || [],

                location: location || {},

                imageUrl,

                images: images || [],

                bestTimeToVisit,

                visitingHours,

                entryFee,

                estimatedVisitTime,

                relatedTemples: relatedTemples || [],

                spiritualSignificance,

                updatedBy: actorEmail,

                updatedAt: new Date()

            },

            { new: true }

        );



        if (!updatedBodhiPath) {

            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });

        }



        // Log activity

        await logActivity('UPDATE', 'BodhiPath', bodhiPathId, title, actorEmail, actorRole, {

            category, shortDescription

        });

        emitRealtime('bodhi-path-updated', { bodhiPath: updatedBodhiPath, updatedBy: actorEmail, actorRole });



        res.json({

            success: true,

            message: 'Bodhi Path entry updated successfully',

            bodhiPath: updatedBodhiPath

        });

    } catch (err) {

        console.error('Update Bodhi Path error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Delete Bodhi Path entry (Admin only)

app.delete('/admin/bodhi-path/delete', verifyAdmin, async (req, res) => {

    try {

        const { bodhiPathId, deletedBy, deletedByRole } = req.body;

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({ success: false, message: 'Only Admin can delete Bodhi Path entries permanently' });

        }



        const deletedBodhiPath = await BodhiPath.findByIdAndDelete(bodhiPathId);



        if (!deletedBodhiPath) {

            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });

        }



        await logActivity('DELETE', 'BodhiPath', bodhiPathId, deletedBodhiPath.title, deletedBy || req.actor?.email, deletedByRole || req.actor?.role);

        emitRealtime('bodhi-path-deleted', { bodhiPathId, title: deletedBodhiPath.title, deletedBy: deletedBy || req.actor?.email });



        res.json({ success: true, message: 'Bodhi Path entry deleted successfully' });

    } catch (err) {

        console.error('Delete Bodhi Path error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Get Bodhi Path entries by category

app.get('/bodhi-path/category/:category', async (req, res) => {

    try {

        const bodhiPaths = await BodhiPath.find({ category: req.params.category });

        res.json({ success: true, bodhiPaths });

    } catch (err) {

        console.error('Error fetching Bodhi Path by category:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- SUPPORT DESK, ESCALATION, AND TAXI SERVICE ROUTES ---

// ---------------------------------------------------------



app.post('/support/verify-customer', verifySupportActor(['support', 'specialist', 'assistant', 'admin']), async (req, res) => {

    try {

        const { name, fullName, dob, dateOfBirth, phone, mobile } = req.body;

        const cleanName = String(fullName || name || '').trim();

        const cleanPhone = normalizePhone(phone || mobile);

        const dobRange = dateOnlyRange(dob || dateOfBirth);

        if (!cleanName || !cleanPhone || !dobRange) {

            return res.status(400).json({ success: false, message: 'Name, DOB, and mobile number are required' });

        }

        const customer = await User.findOne({

            role: 'customer',

            phone: cleanPhone,

            dob: dobRange,

            $or: [{ fullName: cleanName }, { name: cleanName }]

        }).select(publicUserFields);

        if (!customer) return res.status(404).json({ success: false, message: 'No exact customer match found' });

        res.json({ success: true, customer: buildSafeUserProfile(customer) });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/support/tickets', verifySupportActor(['support', 'specialist', 'assistant', 'admin']), async (req, res) => {

    try {

        const { customerId, subject, description, category, priority } = req.body;

        if (!mongoose.Types.ObjectId.isValid(customerId)) return res.status(400).json({ success: false, message: 'Valid customer ID is required' });

        const customer = await User.findById(customerId).select(publicUserFields);

        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

        const ticket = new SupportTicket({

            customerId: customer._id,

            customerEmail: customer.email,

            customerName: customer.fullName || customer.name,

            customerPhone: customer.phone,

            subject,

            description,

            category: category || 'general',

            priority: priority || 'medium',

            createdBy: req.actor.email,

            createdByRole: req.actor.role,

            timeline: [{ action: 'created', note: description, performedBy: req.actor.email, performedByRole: req.actor.role }]

        });

        await ticket.save();

        emitRealtime('support-ticket-created', { ticketId: ticket._id, subject: ticket.subject, tier: ticket.tier });

        res.status(201).json({ success: true, message: 'Ticket created successfully', ticket });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/api/support/tickets', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {

    try {

        const customer = await User.findOne({ email: req.session.email }).select(publicUserFields);

        if (!customer) return res.status(404).json({ success: false, message: 'Customer account not found' });

        const { subject, description, category, priority } = req.body;

        if (!subject || !description) return res.status(400).json({ success: false, message: 'Subject and description are required' });

        const ticket = new SupportTicket({

            customerId: customer._id,

            customerEmail: customer.email,

            customerName: customer.fullName || customer.name,

            customerPhone: customer.phone || '',

            subject,

            description,

            category: category || 'customer-help',

            priority: priority || 'medium',

            createdBy: customer.email,

            createdByRole: 'customer',

            timeline: [{ action: 'created_by_customer', note: description, performedBy: customer.email, performedByRole: 'customer' }]

        });

        await ticket.save();

        emitRealtime('support-ticket-created', { ticketId: ticket._id, subject: ticket.subject, tier: ticket.tier });

        res.status(201).json({ success: true, message: 'Support ticket created successfully', ticket });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/support/tickets', verifySupportActor(['support', 'specialist', 'assistant', 'admin']), async (req, res) => {

    try {

        const actorTier = req.actor.role === 'admin' ? 'admin' : req.actor.role === 'assistant' ? 'assistant' : req.actor.role === 'specialist' ? 'specialist' : 'tier1';

        const filter = req.actor.role === 'admin' ? {} : { $or: [{ tier: actorTier }, { assignedTo: req.actor.email }] };

        const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 });

        res.json({ success: true, tickets });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/support/tickets/:id/escalate', verifySupportActor(['support', 'specialist', 'assistant', 'admin']), async (req, res) => {

    try {

        const tier = ['specialist', 'assistant', 'admin'].includes(req.body.targetTier) ? req.body.targetTier : 'specialist';

        const status = tier === 'assistant' ? 'escalated_assistant' : 'escalated_hr';

        const ticket = await SupportTicket.findByIdAndUpdate(

            req.params.id,

            { tier, status, $push: { timeline: { action: `escalated_to_${tier}`, note: req.body.note || '', performedBy: req.actor.email, performedByRole: req.actor.role } } },

            { new: true }

        );

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        emitRealtime('support-ticket-escalated', { ticketId: ticket._id, tier: ticket.tier });

        res.json({ success: true, message: 'Ticket escalated successfully', ticket });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.put('/support/tickets/:id/resolve', verifySupportActor(['support', 'specialist', 'assistant', 'admin']), async (req, res) => {

    try {

        const ticket = await SupportTicket.findByIdAndUpdate(

            req.params.id,

            { status: 'resolved', resolvedAt: new Date(), $push: { timeline: { action: 'resolved', note: req.body.note || '', performedBy: req.actor.email, performedByRole: req.actor.role } } },

            { new: true }

        );

        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        emitRealtime('support-ticket-resolved', { ticketId: ticket._id });

        res.json({ success: true, message: 'Ticket resolved successfully', ticket });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



const TAXI_BASE_FARES = {

    bike: { base: 40, perKm: 12 },

    auto: { base: 70, perKm: 18 },

    sedan: { base: 120, perKm: 28 },

    suv: { base: 180, perKm: 38 },

    tempo: { base: 250, perKm: 45 }

};



const estimateTaxiFare = (vehicleType, pickupLabel, dropoffLabel) => {

    const tariff = TAXI_BASE_FARES[vehicleType] || TAXI_BASE_FARES.sedan;

    const routeText = `${pickupLabel} ${dropoffLabel}`.toLowerCase();

    let estimatedDistanceKm = 8;

    if (routeText.includes('gaya station')) estimatedDistanceKm = 13;

    if (routeText.includes('airport')) estimatedDistanceKm = 11;

    if (routeText.includes('mahabodhi') && routeText.includes('thai')) estimatedDistanceKm = 3;

    return { estimatedDistanceKm, estimatedFare: Math.round(tariff.base + tariff.perKm * estimatedDistanceKm) };

};



app.post('/api/taxi/estimate', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {

    const vehicleType = req.body.vehicleType || 'sedan';

    const pickupLabel = String(req.body.pickup || req.body.pickupLocation || '').trim();

    const dropoffLabel = String(req.body.dropoff || req.body.dropoffLocation || '').trim();

    if (!pickupLabel || !dropoffLabel) return res.status(400).json({ success: false, message: 'Pickup and dropoff are required' });

    res.json({ success: true, vehicleType, ...estimateTaxiFare(vehicleType, pickupLabel, dropoffLabel) });

});



app.post('/api/taxi/rides', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {

    try {

        const customer = await User.findOne({ email: req.session.email }).select(publicUserFields);

        if (!customer) return res.status(404).json({ success: false, message: 'Customer account not found' });

        const vehicleType = req.body.vehicleType || 'sedan';

        const pickupLabel = String(req.body.pickup || req.body.pickupLocation || '').trim();

        const dropoffLabel = String(req.body.dropoff || req.body.dropoffLocation || '').trim();

        if (!pickupLabel || !dropoffLabel) return res.status(400).json({ success: false, message: 'Pickup and dropoff are required' });

        const estimate = estimateTaxiFare(vehicleType, pickupLabel, dropoffLabel);

        const availableTaxi = await Taxi.findOne({ vehicleType, liveStatus: 'available', isActive: true }).sort({ updatedAt: -1 });

        const ride = new RideRequest({

            customerId: customer._id,

            customerEmail: customer.email,

            customerName: customer.fullName || customer.name,

            customerPhone: customer.phone || '',

            pickup: { label: pickupLabel },

            dropoff: { label: dropoffLabel },

            vehicleType,

            ...estimate,

            taxiId: availableTaxi?._id || null,

            assignedDriverName: availableTaxi?.driverName || '',

            assignedDriverPhone: availableTaxi?.driverPhone || '',

            status: availableTaxi ? 'assigned' : 'requested'

        });

        await ride.save();

        emitRealtime('ride-requested', { rideId: ride._id, pickup: pickupLabel, dropoff: dropoffLabel, vehicleType });

        res.status(201).json({ success: true, message: 'Ride request submitted successfully', ride });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/admin/taxis', verifyAdminOrAssistant('manageBookings'), async (req, res) => {

    try {

        const taxis = await Taxi.find().sort({ updatedAt: -1 });

        const rides = await RideRequest.find().sort({ createdAt: -1 }).limit(50);

        res.json({ success: true, taxis, rides });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/admin/taxis', verifyAdmin, async (req, res) => {

    try {

        const taxi = new Taxi({ ...req.body, createdBy: req.actor.email });

        await taxi.save();

        res.status(201).json({ success: true, message: 'Taxi created successfully', taxi });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ UPDATE HOTEL ENDPOINTS FOR NEW FIELDS ---

// ---------------------------------------------------------



// Update hotel with distance from landmark and highlights

app.put('/hotel/update-distance-highlights', requireSession(['hotel']), async (req, res) => {

    try {

        const { distanceFromLandmark, gyanGarbhHighlights } = req.body;

        const ownerEmail = req.session.email;



        const updatedHotel = await Hotel.findOneAndUpdate(

            { ownerEmail },

            {

                distanceFromLandmark: distanceFromLandmark || { value: 0, unit: 'km', landmark: 'Mahabodhi Temple' },

                gyanGarbhHighlights: gyanGarbhHighlights || ""

            },

            { new: true }

        );



        if (!updatedHotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        emitRealtime('hotel-updated', { ownerEmail, hotelName: updatedHotel.hotelName });

        res.json({

            success: true,

            message: 'Hotel distance and highlights updated successfully',

            hotel: updatedHotel

        });

    } catch (err) {

        console.error('Update hotel distance error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ SECRET ADMIN PANEL ROUTES ---

// ---------------------------------------------------------



// Admin Dashboard Data (All statistics)

app.get('/admin/dashboard', verifyAdminOrAssistant('viewReports'), async (req, res) => {

    try {

        const totalHotels = await Hotel.countDocuments();

        const totalBookings = await Booking.countDocuments();

        const totalUsers = await User.countDocuments();

        const totalAssistants = await Assistant.countDocuments();

        const totalCustomers = await Enquiry.countDocuments();

        const pendingBookings = await Booking.countDocuments({ status: 'Pending' });

        const confirmedBookings = await Booking.countDocuments({ status: 'Confirmed' });



        const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);

        const recentEnquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(5);



        res.json({

            success: true,

            hotelCount: totalHotels,

            customerCount: totalCustomers,

            dashboard: {

                stats: {

                    totalHotels,

                    totalBookings,

                    totalUsers,

                    totalAssistants,

                    totalCustomers,

                    pendingBookings,

                    confirmedBookings

                },

                recentBookings,

                recentEnquiries

            }

        });

    } catch (err) {

        console.error('Dashboard error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ACTIVITY LOG ENDPOINT - Admin only

app.get('/admin/activity-log', verifyAdmin, async (req, res) => {

    try {

        const { userEmail, userRole } = req.query;



        // Verify admin

        if (userRole !== 'admin' || userEmail !== ADMIN_EMAIL) {

            return res.status(403).json({ success: false, message: 'Admin access required' });

        }



        const activities = await ActivityLog.find()

            .sort({ timestamp: -1 })

            .limit(200);



        res.json({ success: true, activities });

    } catch (err) {

        console.error('Activity log error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â± SEED BODHI PATH DATA (Run once to populate heritage data) ---

// ---------------------------------------------------------



app.post('/admin/seed-heritage-data', verifyAdmin, async (req, res) => {

    try {

        if (req.session.role !== 'admin') {

            return res.status(403).json({ success: false, message: 'Only Admin can seed heritage data' });

        }

        // Check if data already exists

        const existingCount = await BodhiPath.countDocuments();

        if (existingCount > 0) {

            return res.status(400).json({

                success: false,

                message: 'Heritage data already exists. Delete and try again if needed.'

            });

        }



        const heritageData = [

            {

                title: "Mahabodhi Temple",

                category: "temple",

                shortDescription: "The ancient temple where Buddha attained enlightenment, a UNESCO World Heritage Site and one of the oldest brick structures in India.",

                fullDescription: "The Mahabodhi Temple is the most sacred temple in Bodh Gaya and stands as a testament to the spiritual significance of this place. Built in the 5th-6th century, it marks the exact location where Siddhartha Gautama achieved enlightenment under the Bodhi Tree. The temple's architecture is a masterpiece of ancient Indian design with intricate carvings and sculptures depicting various scenes from Buddha's life.",

                significance: "This is the holiest pilgrimage site for Buddhists worldwide. The temple represents the culmination of Buddha's spiritual journey and serves as a beacon for millions of devotees seeking spiritual awakening.",

                historicalFacts: [

                    "Built around 500 CE during the reign of King Ashoka",

                    "The temple stands about 52 meters (170 feet) tall",

                    "It is one of the oldest brick temples in the world",

                    "UNESCO declared it a World Heritage Site in 2002"

                ],

                location: {

                    address: "Bodhi Marg, Bodh Gaya, Bihar 824231"

                },

                imageUrl: "https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800",

                bestTimeToVisit: "October to March",

                visitingHours: "5:00 AM - 9:00 PM daily",

                entryFee: "Free",

                estimatedVisitTime: "2-3 hours",

                relatedTemples: ["Bodh Gaya Temple", "Chinese Temple"],

                spiritualSignificance: "The site of Buddha's enlightenment"

            },

            {

                title: "Bodhi Tree",

                category: "monument",

                shortDescription: "The sacred fig tree under which Buddha attained enlightenment, believed to be over 2,500 years old.",

                fullDescription: "The Bodhi Tree stands in the compound of the Mahabodhi Temple. This sacred fig tree is one of the most revered natural monuments in the world. Prince Siddhartha sat beneath this tree and meditated for 49 days, during which he attained enlightenment.",

                significance: "The Bodhi Tree represents the path to spiritual awakening and enlightenment.",

                historicalFacts: [

                    "The original tree was planted about 2,500 years ago",

                    "The tree has been replanted several times due to damage",

                    "The current tree is said to be a descendant of the original"

                ],

                location: {

                    address: "Inside Mahabodhi Temple complex, Bodh Gaya"

                },

                imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",

                bestTimeToVisit: "October to March",

                visitingHours: "5:00 AM - 9:00 PM",

                entryFee: "Free",

                estimatedVisitTime: "1-2 hours",

                spiritualSignificance: "The exact spot of Buddha's enlightenment"

            },

            {

                title: "Great Buddha Statue",

                category: "monument",

                shortDescription: "A magnificent 25-meter tall statue of Buddha overlooking Bodh Gaya, symbol of peace and compassion.",

                fullDescription: "The Great Buddha Statue stands as a modern monument to Buddha's teachings. This impressive statue overlooks the plains of Bodh Gaya and represents Buddha's teachings of peace, non-violence, and compassion.",

                significance: "The statue represents Buddha's teachings of peace and compassion for all beings.",

                location: {

                    address: "Bodh Gaya, Bihar"

                },

                imageUrl: "https://images.unsplash.com/photo-1584734259123-456789012345?w=800",

                bestTimeToVisit: "October to March",

                visitingHours: "6:00 AM - 6:00 PM",

                entryFee: "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹50",

                estimatedVisitTime: "1-2 hours",

                spiritualSignificance: "Meditation on Buddha's teachings"

            },

            {

                title: "Chinese Temple",

                category: "temple",

                shortDescription: "A beautiful Chinese Buddhist temple with traditional architecture hosting pilgrims from East Asia.",

                fullDescription: "The Chinese Temple is one of the international Buddhist temples in Bodh Gaya, built by Chinese Buddhists. It features traditional Chinese architectural elements and ornate decorations.",

                significance: "Represents the global reach of Buddhism and provides a space for East Asian Buddhist communities.",

                location: {

                    address: "Near Mahabodhi Temple, Bodh Gaya"

                },

                imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",

                bestTimeToVisit: "October to March",

                visitingHours: "6:00 AM - 8:00 PM",

                entryFee: "Free",

                estimatedVisitTime: "1-2 hours",

                spiritualSignificance: "Eastern Buddhist traditions"

            },

            {

                title: "Buddha Jayanti Festival",

                category: "festival",

                shortDescription: "Annual celebration commemorating Buddha's birth with prayers, processions, and cultural events.",

                fullDescription: "The Buddha Jayanti Festival is celebrated annually on the full moon day of May. It commemorates Buddha's birth, enlightenment, and death. The festival features thousands of pilgrims gathering for prayers, processions, and meditation sessions.",

                significance: "Brings together Buddhists from around the world to celebrate their shared faith.",

                historicalFacts: [

                    "Celebrated on the full moon day of May",

                    "Also known as Buddha Purnima or Vesak",

                    "Thousands of pilgrims participate in celebrations"

                ],

                bestTimeToVisit: "May during the festival",

                estimatedVisitTime: "Full day event",

                spiritualSignificance: "Celebrating Buddha's teachings"

            }

        ];



        await BodhiPath.insertMany(heritageData);

        res.status(201).json({

            success: true,

            message: 'Heritage data seeded successfully!',

            count: heritageData.length

        });

    } catch (err) {

        console.error('Seed data error:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



if (require.main === module) {

    server.listen(PORT, () => { console.log(`Gyan Garbh Server Active on ${PORT}`); });

}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.connectDatabase = connectDatabase;





