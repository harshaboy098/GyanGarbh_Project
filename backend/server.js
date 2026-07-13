const dns = require('dns');

// 🚀 Google DNS ko force karein taaki local internet block bypass ho jaye

dns.setServers(['8.8.8.8', '8.8.4.4']);

if (dns.setDefaultResultOrder) {

    dns.setDefaultResultOrder('ipv4first');

}



const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');

const http = require('http');

const mongoose = require('mongoose');

const cors = require('cors');

const mongoSanitize = require('express-mongo-sanitize');

const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const nodemailer = require('nodemailer');

const cloudinary = require('cloudinary').v2;

const multer = require('multer');

const { CloudinaryStorage } = require('multer-storage-cloudinary');

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



const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN = /^[+]?[\d\s()-]{7,20}$/;

const PASSWORD_MIN_LENGTH = 8;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const RESET_TTL_MS = 10 * 60 * 1000;

const realtimeClients = new Set();

const ephemeralSessionSecret = crypto.randomBytes(32).toString('hex');



const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeEmail(value));

const isValidPhone = (value) => !value || PHONE_PATTERN.test(String(value).trim());

const isStrongEnoughPassword = (value) => typeof value === 'string' && value.length >= PASSWORD_MIN_LENGTH;

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

const publicHotelQuery = (query) => query.select('-password');

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



// ⭐ NAYA MODEL: Gyan Garbh Control System

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

const Enquiry = mongoose.model('Enquiry', enquirySchema);



// ⭐ ACTIVITY LOG MODEL - Track all changes by Admin/Assistant

const app = express();

const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 5000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '47696856369-b8pck7a7n94fsp303ltmmh5qpk4a55dh.apps.googleusercontent.com';

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

const isProduction = process.env.NODE_ENV === 'production';

const MONGO_URI = process.env.MONGODB_URI || '';

const EMAIL_PASS = process.env.EMAIL_PASS || '';

const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/^['"]|['"]$/g, '');

const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim().replace(/^['"]|['"]$/g, '');



cloudinary.config({

    cloud_name: cloudinaryCloudName,

    api_key: cloudinaryApiKey,

    api_secret: cloudinaryApiSecret,

    secure: true

});



if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {

    console.warn('Cloudinary config warning: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for hotel image uploads.');

}



const hotelImageStorage = new CloudinaryStorage({

    cloudinary,

    params: {

        folder: 'GyanGarbh/Hotels',

        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],

        transformation: [{ width: 1600, height: 1200, crop: 'limit' }]

    }

});



const uploadHotelImages = multer({ storage: hotelImageStorage });

const uploadProfilePic = multer({ storage: hotelImageStorage });



const allowedCorsOrigins = new Set([

    'http://localhost:5000',

    'http://localhost:3000',

    'http://localhost:5500',

    'http://127.0.0.1:5500',

    'http://localhost:5173',

    'http://127.0.0.1:5173',

    'null',

    'https://gyangarbh-project.vercel.app',

    'https://gyan-garbh-project.vercel.app',

    'https://gyan-garbh-project-9dbzmsr4q-gyan-grabh-s-projects.vercel.app'

]);



const isAllowedVercelOrigin = (origin) => {

    try {

        const { protocol, hostname } = new URL(origin);

        return protocol === 'https:' && hostname.endsWith('.vercel.app');

    } catch {

        return false;

    }

};



const corsOptions = {

    origin(origin, callback) {

        if (!origin || allowedCorsOrigins.has(origin) || isAllowedVercelOrigin(origin)) {

            return callback(null, true);

        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));

    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],

    optionsSuccessStatus: 204

};



const io = new Server(server, {

    cors: corsOptions

});



app.use(cors(corsOptions));

app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Express 5 exposes req.query as a read-only property, so sanitize objects in place.

app.use((req, res, next) => {

    ['body', 'query', 'params'].forEach((key) => {

        if (req[key]) mongoSanitize.sanitize(req[key]);

    });

    next();

});



const encodeTokenPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const decodeTokenPart = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const getSessionSecret = () => process.env.SESSION_SECRET || ADMIN_PASSWORD || ephemeralSessionSecret;

const normalizeEnterpriseRole = (role) => {

    if (['guest', 'mitra', 'customer'].includes(role)) return 'customer';

    if (['assistant', 'manager'].includes(role)) return 'assistant';

    return role;

};

const signTokenPayload = (payload) => crypto

    .createHmac('sha256', getSessionSecret())

    .update(payload)

    .digest('base64url');

const createSessionToken = (role, email) => {

    const encodedPayload = encodeTokenPart({ role, enterpriseRole: normalizeEnterpriseRole(role), email: normalizeEmail(email), exp: Date.now() + SESSION_TTL_MS });

    return `${encodedPayload}.${signTokenPayload(encodedPayload)}`;

};

const verifySessionToken = (token) => {

    try {

        const [encodedPayload, signature] = String(token || '').split('.');

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

    return header.startsWith('Bearer ') ? header.slice(7) : req.query.token;

};

const requireSession = (allowedRoles = []) => (req, res, next) => {

    const session = verifySessionToken(readSessionToken(req));

    const allowedEnterpriseRoles = allowedRoles.map(normalizeEnterpriseRole);

    if (!session || (allowedRoles.length && !allowedRoles.includes(session.role) && !allowedEnterpriseRoles.includes(session.enterpriseRole))) {

        return res.status(401).json({ success: false, message: 'Authentication required' });

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



// ⭐ ROLE-BASED ACCESS CONTROL MIDDLEWARE

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

    if (requestedRole === 'admin' && email === ADMIN_EMAIL) {

        return { email, role: 'admin', permissions: {} };

    }

    if (requestedRole === 'assistant') {

        const assistant = await Assistant.findOne({ email, isActive: true }).select('email role permissions');

        if (assistant) {

            return { email: assistant.email, role: 'assistant', permissions: assistant.permissions || {} };

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

        const actor = await getRequestActor(req);

        if (!actor || actor.role !== 'assistant') {

            return res.status(403).json({ success: false, message: 'Assistant access required' });

        }

        if (permission && actor.permissions?.[permission] !== true) {

            return res.status(403).json({ success: false, message: `Assistant permission required: ${permission}` });

        }

        req.actor = actor;

        return next();

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifyAdminOrAssistant = (permission = null) => async (req, res, next) => {

    try {

        const actor = await getRequestActor(req);

        if (!actor) return res.status(403).json({ success: false, message: 'Admin or assistant access required' });

        if (actor.role === 'admin') {

            req.actor = actor;

            return next();

        }

        if (actor.role === 'assistant' && (!permission || actor.permissions?.[permission] === true)) {

            req.actor = actor;

            return next();

        }

        return res.status(403).json({ success: false, message: permission ? `Assistant permission required: ${permission}` : 'Unauthorized access' });

    } catch (err) {

        return res.status(500).json({ success: false, message: err.message });

    }

};



const verifySupportActor = (allowedRoles = ['support', 'specialist', 'assistant', 'admin']) => async (req, res, next) => {

    try {

        const session = verifySessionToken(readSessionToken(req));

        if (session) req.session = session;

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

    const session = verifySessionToken(readSessionToken(req));

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



const verifyAdminOnly = (email, role) => role === 'admin' && email === ADMIN_EMAIL;



const slugify = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/(^-|-$)/g, '') || 'hotel';

const generateDefaultHotelEmail = (hotelName) => `${slugify(hotelName)}${Math.floor(100 + Math.random() * 900)}@gyangarbh.com`;

const generateDefaultPassword = () => `Gyan@${Math.random().toString(36).slice(2,10)}${Math.floor(10 + Math.random() * 89)}`;



const resolveActorRole = async (email, requestedRole) => {

    if (email === ADMIN_EMAIL && (!requestedRole || requestedRole === 'admin')) return 'admin';

    if ((!requestedRole || requestedRole === 'assistant') && await Assistant.exists({ email, isActive: true })) return 'assistant';

    return null;

};



const sendBookingCancellationAlert = async (booking, reason) => {

    // Placeholder: replace with WhatsApp provider and transporter.sendMail calls.

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



// Email Setup

if ((!process.env.EMAIL_USER || !EMAIL_PASS) && !isProduction) {

    console.warn('EMAIL_USER or EMAIL_PASS is not set. Add them to backend/.env for local email delivery.');

}



const transporter = nodemailer.createTransport({

    service: 'gmail',

    host: 'smtp.gmail.com',

    port: 465,

    secure: true,

    auth: {

        user: process.env.EMAIL_USER,

        pass: EMAIL_PASS

    }

});



transporter.verify((error) => {

    if (error) {

        console.error('Gmail SMTP connection failed:', error.message);

        return;

    }

    console.log('Gmail SMTP transporter ready.');

});



if (!MONGO_URI) {

    console.error('Missing MONGODB_URI environment variable. Please set it in .env or Render settings.');

    process.exit(1);

}

const mongooseMajorVersion = Number((mongoose.version || '0').split('.')[0]);

const mongooseOptions = {

    ...(mongooseMajorVersion < 6 ? { useNewUrlParser: true, useUnifiedTopology: true } : {}),

    serverSelectionTimeoutMS: 15000,

    connectTimeoutMS: 30000,

    socketTimeoutMS: 45000

};



const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;



async function ensureAdminUser() {

    try {

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {

            console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is not configured. Admin seed skipped.');

            return;

        }



        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        await User.findOneAndUpdate(

            { email: ADMIN_EMAIL },

            {

                name: 'Admin',

                fullName: 'Admin',

                email: ADMIN_EMAIL,

                password: hashedPassword,

                role: 'admin',

                phone: '',

                address: ''

            },

            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }

        );



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



mongoose.connect(MONGO_URI, mongooseOptions)

  .then(async () => {

      console.log('🚀 Connected to Gyan Garbh Database!');

      await ensureAdminUser();

      await ensureOperationalIndexes();

  })

  .catch((err) => {

      console.error("DATABASE ERROR: ", err.message);

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

// --- 🔑 ADMIN LOGIN ROUTE ---

// ---------------------------------------------------------



app.post(['/admin-login', '/api/admin-login'], async (req, res) => {

    try {

        const { email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) {

            return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        }

        const adminUser = await User.findOne({ email: normalizedEmail, role: 'admin' });



        if (!adminUser) {

            await logSecurityEvent('Failed Login', email || 'unknown', email || 'unknown', 'admin', 'Admin login attempted with invalid email');

            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

        }



        const passwordMatch = await bcrypt.compare(password, adminUser.password);

        if (!passwordMatch) {

            await logSecurityEvent('Failed Login', adminUser.name || 'Admin', email, 'admin', 'Admin login attempted with invalid password');

            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

        }



        res.status(200).json({ 

            success: true, 

            message: 'Admin Login Successful', 

            role: 'admin',

            userRole: 'admin',

            name: adminUser.name,

            email: adminUser.email,

            sessionToken: createSessionToken('admin', adminUser.email)

        });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



// ---------------------------------------------------------

// --- 📩🔐 OTP ROUTES (Signup + Reset) ---

// ---------------------------------------------------------



app.post(['/send-otp', '/api/send-otp'], async (req, res) => {

    const { email, isReset, name, fullName, password, role, experience, phone, dob, dateOfBirth, village, villageCity, city, pinCode, pincode, pin, address, hotelName } = req.body;

    try {

        const normalizedEmail = String(email || '').trim().toLowerCase();

        const requestedRole = ['guest', 'mitra', 'customer', 'hotel'].includes(role) ? role : 'customer';

        const cleanRole = requestedRole === 'hotel' ? 'hotel' : requestedRole === 'mitra' ? 'mitra' : 'customer';



        if (!isValidEmail(normalizedEmail)) {

            return res.status(400).json({ success: false, message: "A valid email address is required." });

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

                    location: resolvedVillageCity || hotelName || "Bodhgaya"

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



        const mailOptions = {

            from: `"Gyan Garbh Security" <${process.env.EMAIL_USER}>`,

            to: normalizedEmail,

            subject: isReset ? 'Reset Password OTP' : 'Verification Code',

            html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">

                    <h2 style="color: #1e3c72;">Gyan Garbh</h2>

                    <p>Your 6-digit verification code is:</p>

                    <h1 style="color: #ffc107; letter-spacing: 5px;">${otp}</h1>

                    <p>This code is valid for 5 minutes.</p>

                   </div>`

        };



        try {

            await transporter.sendMail(mailOptions);

        } catch (mailError) {

            if (otpStore[normalizedEmail]?.timeoutId) clearTimeout(otpStore[normalizedEmail].timeoutId);

            delete otpStore[normalizedEmail];

            console.error('OTP email send failed:', mailError);

            return res.status(502).json({

                success: false,

                message: 'OTP email could not be sent. Please check the email configuration and try again.'

            });

        }

        res.json({ success: true, message: "OTP Sent" });

    } catch (error) {

        console.error('Send OTP error:', error);

        res.status(500).json({ success: false, message: "Unable to process OTP request. Please try again." });

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

        

        // 🔒 FORGOT PASSWORD / PASSWORD RESET FLOW

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



        // 🔒 NEW HOTEL PARTNER ACCOUNT CREATION

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

                description: `Welcome to ${pending.hotelName}`

            });

            await newHotel.save();

            

            // Delete cache only AFTER successful database storage

            if (record.timeoutId) clearTimeout(record.timeoutId);

            delete otpStore[normalizedEmail];

            delete pendingRegistrationStore[normalizedEmail];

            

            return res.json({ success: true, message: 'Hotel owner registered successfully.', role: 'hotel', name: pending.name, email: pending.email, sessionToken: createSessionToken('hotel', pending.email) });

        }

        

        // 🔒 NEW CUSTOMER / MITRA REGISTRATION

        // ⭐ VALIDATE PENDING DATA BEFORE CREATING USER

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

// --- 👤 USER & MITRA ROUTES ---

// ---------------------------------------------------------



app.post(['/login', '/api/login'], async (req, res) => {

    try {

        const { email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {

            // User not found - provide helpful message

            return res.status(401).json({ success: false, message: "Invalid email or password. If you haven't signed up yet, please create an account first.", errorType: 'NO_ACCOUNT' });

        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid email or password. Please check and try again.", errorType: 'INVALID_PASSWORD' });

        res.status(200).json({

            success: true,

            userId: user._id,

            name: user.name,

            fullName: user.fullName || user.name,

            email: user.email,

            phone: user.phone,

            role: user.role,

            profilePic: user.profilePic || user.photoURL || '',

            sessionToken: createSessionToken(user.role, user.email)

        });

    } catch (err) {

        console.error('Login error:', err.message);

        res.status(500).json({ success: false, message: 'Login failed. Please try again.', errorType: 'SERVER_ERROR' });

    }

});



app.post('/api/user/upload-profile-pic', verifyProfileUploadActor('manageMitra'), uploadProfilePic.single('profilePic'), async (req, res) => {

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



// ⭐ GOOGLE LOGIN ENDPOINT

app.post('/google-login', async (req, res) => {

    try {

        const { idToken, name, email, googleId, photoURL } = req.body;

        if (!idToken) return res.status(400).json({ success: false, message: 'Google ID token is required' });

        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });

        const payload = ticket.getPayload();



        const verifiedEmail = normalizeEmail(payload?.email || email);

        const verifiedName = payload?.name || name;

        const verifiedGoogleId = payload?.sub || googleId;

        const verifiedPhoto = payload?.picture || photoURL;



        if (!isValidEmail(verifiedEmail)) {

            return res.status(400).json({ success: false, message: 'Google login failed: email not found' });

        }



        let user = await User.findOne({ email: verifiedEmail });



        if (user) {

            if (!user.googleId && verifiedGoogleId) {

                user.googleId = verifiedGoogleId;

                user.photoURL = verifiedPhoto;

                await user.save();

            }

            return res.status(200).json({

                success: true,

                userId: user._id,

                name: user.name,

                fullName: user.fullName || user.name,

                email: user.email,

                role: user.role,

                profilePic: user.profilePic || user.photoURL || '',

                message: 'Login successful',

                sessionToken: createSessionToken(user.role, user.email)

            });

        } else {

            const newUser = new User({

                name: verifiedName || 'Google User',

                fullName: verifiedName || 'Google User',

                email: verifiedEmail,

                password: await bcrypt.hash(Math.random().toString(36), 10),

                role: 'customer',

                googleId: verifiedGoogleId,

                photoURL: verifiedPhoto,

                profilePic: verifiedPhoto || '',

                date: new Date()

            });

            await newUser.save();

            return res.status(201).json({

                success: true,

                userId: newUser._id,

                name: newUser.name,

                fullName: newUser.fullName || newUser.name,

                email: newUser.email,

                role: newUser.role,

                profilePic: newUser.profilePic || newUser.photoURL || '',

                message: 'Account created successfully',

                sessionToken: createSessionToken(newUser.role, newUser.email)

            });

        }

    } catch (err) {

        console.error('Google login error:', err);

        res.status(500).json({ success: false, message: "Google login failed" });

    }

});



const mitraUserFilter = { $or: [{ role: 'mitra' }, { role: 'customer', experience: { $exists: true, $ne: '' } }] };



app.get('/all-mitras', async (req, res) => {

    try {

        const mitras = await publicUserQuery(User.find({ ...mitraUserFilter, isLocked: { $ne: true } }));

        res.json(mitras);

    } catch (err) { res.status(500).send(err.message); }

});



app.post('/mitra-enquiry', async (req, res) => {

    try {

        const newEnquiry = new Enquiry(req.body);

        await newEnquiry.save();

        res.status(200).json({ success: true, message: "Logged with Gyan Garbh" });

    } catch (err) { res.status(500).json({ success: false }); }

});



app.use('/admin', (req, res, next) => {

    const hotelAllowedAdminPaths = ['/add-room', '/upload-hotel-images'];

    const allowedRoles = hotelAllowedAdminPaths.includes(req.path) ? ['admin', 'assistant', 'hotel'] : ['admin', 'assistant'];

    return requireSession(allowedRoles)(req, res, () => {

        const { email, role } = req.session;

        if (req.session.enterpriseRole === 'assistant' && req.method === 'DELETE') {

            return res.status(403).json({ success: false, message: 'Assistants cannot delete data' });

        }

        if (req.body && typeof req.body === 'object') {

            ['updatedBy', 'createdBy', 'deletedBy'].forEach((key) => {

                if (key in req.body) req.body[key] = email;

            });

            ['updatedByRole', 'createdByRole', 'deletedByRole'].forEach((key) => {

                if (key in req.body) req.body[key] = role;

            });

        }

        next();

    });

});



app.get('/admin/enquiries', verifyAdminOrAssistant('manageCustomers'), async (req, res) => {

    try {

        const data = await safeSortQuery(Enquiry.find(), { createdAt: -1 });

        res.json(data);

    } catch (err) { res.status(500).json([]); }

});



// ---------------------------------------------------------

// --- 👑 ADMIN MANAGEMENT ROUTES ---

// ---------------------------------------------------------



// Get all users (customers, hotels, mitras) for admin panel

app.get('/admin/all-users', verifyAdmin, async (req, res) => {

    try {

        // Get all regular users (customers and mitras)

        const users = await User.find().select('-password'); // Exclude password field



        // Get all hotels

        const hotels = await Hotel.find().select('-password'); // Exclude password field



        // Get all enquiries (customers)

        const enquiries = await Enquiry.find();



        // Combine and categorize

        const allUsers = {

            customers: enquiries.map(enquiry => ({

                _id: enquiry._id,

                name: enquiry.customerName,

                email: enquiry.customerEmail,

                phone: enquiry.customerPhone,

                type: 'customer',

                status: enquiry.status,

                createdAt: enquiry.createdAt,

                updatedBy: enquiry.updatedBy,

                isLocked: enquiry.isLocked

            })),

            mitras: users.filter(user => user.role === 'customer' && user.experience).map(mitra => ({

                _id: mitra._id,

                name: mitra.name,

                email: mitra.email,

                phone: mitra.phone,

                address: mitra.address,

                type: 'mitra',

                experience: mitra.experience,

                photoURL: mitra.photoURL,

                profilePic: mitra.profilePic,

                imageUrl: mitra.profilePic || mitra.photoURL || '',

                createdAt: mitra.date,

                updatedBy: mitra.updatedBy,

                isLocked: mitra.isLocked

            })),

            hotels: hotels.map(hotel => ({

                _id: hotel._id,

                hotelName: hotel.hotelName,

                name: hotel.hotelName,

                email: hotel.ownerEmail,

                ownerEmail: hotel.ownerEmail,

                phone: hotel.phone,

                address: hotel.address,

                type: 'hotel',

                location: hotel.location,

                roomRate: hotel.roomRate,

                rating: hotel.rating,

                description: hotel.description,

                imageUrl: hotel.imageUrl,

                imageUrl2: hotel.imageUrl2,

                imageUrl3: hotel.imageUrl3,

                images: [hotel.imageUrl, hotel.imageUrl2, hotel.imageUrl3].filter(Boolean),

                createdAt: hotel.createdAt || new Date(),

                updatedBy: hotel.updatedBy,

                isLocked: hotel.isLocked

            })),

            guests: users.filter(user => user.role === 'customer' && !user.experience).map(guest => ({

                _id: guest._id,

                name: guest.name,

                email: guest.email,

                phone: guest.phone,

                address: guest.address,

                type: 'guest',

                createdAt: guest.date

            }))

        };



        res.json({ success: true, ...allUsers });

    } catch (err) {

        console.error('Error fetching all users:', err);

        res.status(500).json({ success: false, message: 'Error fetching users' });

    }

});



// Update hotel details

app.put('/admin/update-hotel', verifyAdminOrAssistant('manageHotels'), async (req, res) => {

    try {

        const { hotelId, hotelName, ownerEmail, phone, address, location, roomRate, rating, description, totalRooms, acRoomPrice, nonAcRoomPrice, facilities, imageUrl, imageUrl2, imageUrl3, updatedBy, updatedByRole } = req.body;



        const actorRole = await resolveActorRole(updatedBy || req.actor?.email, updatedByRole || req.actor?.role);

        if (!actorRole) {

            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        }



        const updateData = { updatedBy: updatedBy || req.actor?.email, updatedAt: new Date() };

        if (hotelName !== undefined) updateData.hotelName = hotelName;

        if (ownerEmail !== undefined) updateData.ownerEmail = ownerEmail;

        if (phone !== undefined) updateData.phone = phone;

        if (address !== undefined) updateData.address = address;

        if (location !== undefined) updateData.location = location;

        if (roomRate !== undefined && roomRate !== '') updateData.roomRate = Number(roomRate);

        if (rating !== undefined && rating !== '') updateData.rating = Number(rating);

        if (description !== undefined) updateData.description = description;

        if (totalRooms !== undefined && totalRooms !== '') updateData.totalRooms = Number(totalRooms);

        if (acRoomPrice !== undefined && acRoomPrice !== '') updateData.acRoomPrice = Number(acRoomPrice);

        if (nonAcRoomPrice !== undefined && nonAcRoomPrice !== '') updateData.nonAcRoomPrice = Number(nonAcRoomPrice);

        if (facilities !== undefined) updateData.facilities = facilities || {};

        if (imageUrl !== undefined) updateData.imageUrl = imageUrl || "";

        if (imageUrl2 !== undefined) updateData.imageUrl2 = imageUrl2 || "";

        if (imageUrl3 !== undefined) updateData.imageUrl3 = imageUrl3 || "";



        const updatedHotel = await Hotel.findByIdAndUpdate(hotelId, updateData, { new: true });



        if (!updatedHotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        // Log activity

        await logActivity('UPDATE', 'Hotel', hotelId, updatedHotel.hotelName, updatedBy || req.actor?.email, actorRole, { 

            phone, address, location, rating, description, totalRooms 

        });

        emitRealtime('hotel-updated', { hotel: updatedHotel, updatedBy: updatedBy || req.actor?.email, actorRole });



        res.json({ success: true, message: 'Hotel updated successfully', hotel: updatedHotel });

    } catch (err) {

        console.error('Error updating hotel:', err);

        res.status(500).json({ success: false, message: 'Error updating hotel' });

    }

});



// Create hotel (Admin / Assistant)

app.post('/admin/create-hotel', verifyAdminOrAssistant('manageHotels'), async (req, res) => {

    try {

        const { hotelName, ownerEmail, phone, address, location, roomRate, rating, description, totalRooms, acRoomPrice, nonAcRoomPrice, facilities, imageUrl, imageUrl2, imageUrl3, createdBy, createdByRole } = req.body;

        const actorRole = await resolveActorRole(createdBy || req.actor?.email, createdByRole || req.actor?.role);

        if (!actorRole) {

            await logSecurityEvent('Unauthorized Hotel Creation', hotelName || 'Unknown Hotel', createdBy || req.actor?.email || 'unknown', createdByRole || req.actor?.role || 'unknown', 'Actor cannot create hotels');

            return res.status(403).json({ success: false, message: 'Unauthorized to create hotels' });

        }



        const finalOwnerEmail = String(ownerEmail || '').trim().toLowerCase() || generateDefaultHotelEmail(hotelName);

        if (!isValidEmail(finalOwnerEmail)) {

            return res.status(400).json({ success: false, message: 'A valid hotel owner email is required' });

        }

        const existingHotel = await Hotel.findOne({ $or: [{ ownerEmail: finalOwnerEmail }, { email: finalOwnerEmail }] });

        if (existingHotel) {

            return res.status(400).json({ success: false, message: 'Hotel email already exists' });

        }



        if (!hotelName) {

            return res.status(400).json({ success: false, message: 'Hotel name is required' });

        }



        const generatedPassword = generateDefaultPassword();

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);



        const placeholderImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

        const newHotel = new Hotel({

            hotelName,

            ownerEmail: finalOwnerEmail,

            password: hashedPassword,

            phone,

            address,

            location: location || address || 'Unknown',

            roomRate: Number(roomRate) || 1500,

            rating: Number(rating) || 4.0,

            description: description || '',

            totalRooms: Number(totalRooms) || 0,

            acRoomPrice: Number(acRoomPrice) || 0,

            nonAcRoomPrice: Number(nonAcRoomPrice) || 0,

            facilities: facilities || {},

            imageUrl: imageUrl || placeholderImage,

            imageUrl2: imageUrl2 || '',

            imageUrl3: imageUrl3 || '',

            isLocked: false,

            updatedBy: createdBy || req.actor?.email,

            updatedAt: new Date()

        });

        await newHotel.save();

        await logActivity('CREATE', 'Hotel', newHotel._id, hotelName, createdBy || req.actor?.email, actorRole);

        emitRealtime('hotel-created', { hotel: newHotel, createdBy: createdBy || req.actor?.email, actorRole });

        res.status(201).json({

            success: true,

            message: 'Hotel created successfully',

            hotel: newHotel,

            credentials: {

                email: finalOwnerEmail,

                password: generatedPassword

            }

        });

    } catch (err) {

        console.error('Error creating hotel:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Hotel image upload via Cloudinary

app.post('/admin/upload-hotel-images', requireSession(['hotel', 'admin', 'assistant']), (req, res) => {

    uploadHotelImages.array('hotelImages', 3)(req, res, async (uploadErr) => {

        try {

            if (uploadErr) {

                throw uploadErr;

            }



            if (!req.files || !req.files.length) {

                return res.json({ success: true, images: [], message: 'No hotel images were uploaded.' });

            }



            const uploadedUrls = req.files

                .map((file) => file.path || file.secure_url || file.url)

                .filter(Boolean)

                .map((url) => String(url).trim())

                .filter(Boolean);

            if (!uploadedUrls.length) {

                return res.json({ success: true, images: [], message: 'Uploaded files did not return valid Cloudinary URLs.' });

            }

            const updateData = {

                images: uploadedUrls,

                imageUrl: uploadedUrls[0] || '',

                imageUrl2: uploadedUrls[1] || '',

                imageUrl3: uploadedUrls[2] || '',

                updatedAt: new Date()

            };

            let updatedHotel = null;

            if (req.session?.role === 'hotel' && req.session?.email) {

                updatedHotel = await Hotel.findOneAndUpdate(

                    { ownerEmail: normalizeEmail(req.session.email) },

                    updateData,

                    { new: true }

                );

                if (updatedHotel) {

                    emitRealtime('hotel-updated', { ownerEmail: updatedHotel.ownerEmail, hotelName: updatedHotel.hotelName });

                }

            }



            res.json({ success: true, images: uploadedUrls, hotel: updatedHotel });

        } catch (err) {

            console.error("SERVER UPLOAD CRASH:", err);

            res.status(500).json({
                success: false,
                message: err.message || 'Hotel image upload failed.',
                error: err.name || 'UploadError'
            });

        }

    });

});



app.get('/admin_load-hotel-images', requireSession(['hotel', 'admin', 'assistant']), async (req, res) => {

    try {

        const ownerEmail = normalizeEmail(req.query.ownerEmail || req.session?.email);

        const hotelId = String(req.query.hotelId || '').trim();

        let hotel = null;

        if (hotelId && mongoose.Types.ObjectId.isValid(hotelId)) {

            hotel = await Hotel.findById(hotelId).select('images imageUrl imageUrl2 imageUrl3');

        } else if (ownerEmail) {

            hotel = await Hotel.findOne({ ownerEmail }).select('images imageUrl imageUrl2 imageUrl3');

        }

        const images = Array.isArray(hotel?.images)

            ? hotel.images.filter(Boolean)

            : [hotel?.imageUrl, hotel?.imageUrl2, hotel?.imageUrl3].filter(Boolean);

        res.json({ success: true, images: images || [] });

    } catch (err) {

        console.error('Error loading hotel images:', err);

        res.json({ success: true, images: [], message: 'Hotel images are not available yet.' });

    }

});



// Create mitra (Admin / Assistant)

app.post('/admin/create-mitra', verifyAdminOrAssistant('manageMitra'), async (req, res) => {

    try {

        const { name, email, phone, address, experience, imageUrl, createdBy, createdByRole } = req.body;

        const actorRole = await resolveActorRole(createdBy || req.actor?.email, createdByRole || req.actor?.role);

        if (!actorRole) {

            await logSecurityEvent('Unauthorized Mitra Creation', name || 'Unknown Mitra', createdBy || req.actor?.email || 'unknown', createdByRole || req.actor?.role || 'unknown', 'Actor cannot create mitras');

            return res.status(403).json({ success: false, message: 'Unauthorized to create mitras' });

        }



        if (!name || !isValidEmail(email) || !isValidPhone(phone)) {

            return res.status(400).json({ success: false, message: 'Name, valid email and active mobile number are required.' });

        }



        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {

            return res.status(400).json({ success: false, message: 'Email already exists' });

        }



        const generatedPassword = generateDefaultPassword();

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);



        const placeholderPhoto = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1';

        const newMitra = new User({

            name: name.trim(),

            email: normalizedEmail,

            password: hashedPassword,

            phone: phone || '',

            address: address || '',

            role: 'customer',

            experience: experience || '',

            photoURL: imageUrl || placeholderPhoto,

            profilePic: imageUrl || placeholderPhoto,

            updatedBy: createdBy || req.actor?.email,

            updatedAt: new Date(),

            isLocked: false

        });



        await newMitra.save();

        await logActivity('CREATE', 'Mitra', newMitra._id, newMitra.name, createdBy || req.actor?.email, actorRole);

        emitRealtime('mitra-created', { mitra: newMitra, createdBy: createdBy || req.actor?.email, actorRole });



        res.status(201).json({

            success: true,

            message: 'Mitra created successfully',

            mitra: newMitra,

            credentials: {

                email: newMitra.email,

                password: generatedPassword

            }

        });

    } catch (err) {

        console.error('Error creating mitra:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// ⭐ UPDATE HOTEL DETAILS FROM HOTEL DASHBOARD

app.put('/hotel/update-details', requireSession(['hotel']), async (req, res) => {

    try {

        const { hotelName, roomRate, totalRooms, acRoomPrice, nonAcRoomPrice, description, facilities, imageUrl, imageUrl2, imageUrl3, distanceFromLandmark, gyanGarbhHighlights } = req.body;

        const ownerEmail = req.session.email;

        const updateData = { updatedAt: new Date() };



        if (hotelName !== undefined) updateData.hotelName = hotelName;

        if (roomRate !== undefined && roomRate !== '') updateData.roomRate = Number(roomRate);

        if (totalRooms !== undefined && totalRooms !== '') updateData.totalRooms = Number(totalRooms);

        if (acRoomPrice !== undefined && acRoomPrice !== '') updateData.acRoomPrice = Number(acRoomPrice);

        if (nonAcRoomPrice !== undefined && nonAcRoomPrice !== '') updateData.nonAcRoomPrice = Number(nonAcRoomPrice);

        if (description !== undefined) updateData.description = description || "";

        if (facilities !== undefined) updateData.facilities = facilities || {};

        if (imageUrl !== undefined) updateData.imageUrl = imageUrl || "";

        if (imageUrl2 !== undefined) updateData.imageUrl2 = imageUrl2 || "";

        if (imageUrl3 !== undefined) updateData.imageUrl3 = imageUrl3 || "";

        if (distanceFromLandmark !== undefined) updateData.distanceFromLandmark = distanceFromLandmark || { value: 0, unit: 'km', landmark: 'Mahabodhi Temple' };

        if (gyanGarbhHighlights !== undefined) updateData.gyanGarbhHighlights = gyanGarbhHighlights || "";



        const updatedHotel = await Hotel.findOneAndUpdate(

            { ownerEmail },

            updateData,

            { new: true }

        );



        if (!updatedHotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        emitRealtime('hotel-updated', { ownerEmail, hotelName: updatedHotel.hotelName });

        res.json({ success: true, message: 'Hotel details updated successfully', hotel: updatedHotel });

    } catch (err) {

        console.error('Error updating hotel details:', err);

        res.status(500).json({
            success: false,
            message: err.message || 'Error updating hotel details',
            error: err.name || 'HotelUpdateError'
        });

    }

});



app.put('/update-hotel-status', requireSession(['hotel']), async (req, res) => {

    try {

        const { isAvailable } = req.body;

        const ownerEmail = req.session.email;



        const updatedHotel = await Hotel.findOneAndUpdate(

            { ownerEmail },

            { isAvailable: isAvailable !== false, updatedAt: new Date() },

            { new: true }

        );



        if (!updatedHotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        emitRealtime('hotel-availability', { ownerEmail, isAvailable: updatedHotel.isAvailable });

        res.json({ success: true, message: 'Hotel availability updated', hotel: updatedHotel });

    } catch (err) {

        console.error('Error updating hotel availability:', err);

        res.status(500).json({ success: false, message: 'Error updating hotel availability' });

    }

});



// DELETE HOTEL - permanent removal block

app.delete('/admin/delete-hotel', verifyAdmin, async (req, res) => {

    try {

        const { hotelId, deletedBy, deletedByRole } = req.body;



        // ⭐ ADMIN ONLY - Assistants cannot delete

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({ 

                success: false, 

                message: 'Only Admin can delete hotels permanently' 

            });

        }



        const hotel = await Hotel.findById(hotelId);

        if (!hotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        // Check if hotel has any active bookings

        const activeBookings = await Booking.find({

            hotelName: hotel.hotelName,

            status: { $in: ['Pending', 'Confirmed'] }

        });



        if (activeBookings.length > 0) {

            return res.status(400).json({

                success: false,

                message: 'Cannot delete hotel with active bookings. Cancel all bookings first.'

            });

        }



        const deletedHotel = await Hotel.findByIdAndDelete(hotelId);



        if (!deletedHotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }



        // Remove associated records cleanly

        await Booking.deleteMany({ hotelName: deletedHotel.hotelName });

        await ActivityLog.deleteMany({ $or: [ { entityType: 'Hotel', entityId: hotelId }, { performedBy: deletedHotel.ownerEmail }, { performedBy: deletedHotel.email }] });



        await logActivity('DELETE', 'Hotel', hotelId, deletedHotel.hotelName, deletedBy || req.actor?.email, deletedByRole || req.actor?.role);

        emitRealtime('hotel-deleted', { hotelId, hotelName: deletedHotel.hotelName, deletedBy: deletedBy || req.actor?.email });



        res.json({ success: true, message: 'Hotel deleted successfully and related records cleaned up' });

    } catch (err) {

        console.error('Error deleting hotel:', err);

        res.status(500).json({ success: false, message: 'Error deleting hotel' });

    }

});



// Update mitra details

app.put('/admin/update-mitra', verifyAdminOrAssistant('manageMitra'), async (req, res) => {

    try {

        const { mitraId, name, email, phone, address, experience, imageUrl, updatedBy, updatedByRole } = req.body;

        const actorRole = await resolveActorRole(updatedBy || req.actor?.email, updatedByRole || req.actor?.role);

        if (!actorRole) {

            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        }



        const updateData = {

            name,

            email,

            phone,

            address,

            experience,

            updatedBy: updatedBy || req.actor?.email,

            updatedAt: new Date()

        };

        if (imageUrl !== undefined) {

            updateData.photoURL = imageUrl || '';

            updateData.profilePic = imageUrl || '';

        }



        const updatedMitra = await User.findByIdAndUpdate(

            mitraId,

            updateData,

            { new: true }

        );



        if (!updatedMitra) {

            return res.status(404).json({ success: false, message: 'Mitra not found' });

        }



        await logActivity('UPDATE', 'Mitra', mitraId, updatedMitra.name, updatedBy || req.actor?.email, actorRole, { email, phone, address, experience });

        emitRealtime('mitra-updated', { mitra: updatedMitra, updatedBy: updatedBy || req.actor?.email, actorRole });



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

        const actorRole = await resolveActorRole(updatedBy || req.actor?.email, updatedByRole || req.actor?.role);

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

                updatedBy: updatedBy || req.actor?.email,

                updatedAt: new Date()

            },

            { new: true }

        );



        if (!updatedCustomer) {

            return res.status(404).json({ success: false, message: 'Customer not found' });

        }



        await logActivity('UPDATE', 'Customer', customerId, updatedCustomer.customerName, updatedBy || req.actor?.email, actorRole, { customerEmail, customerPhone, status });

        emitRealtime('customer-updated', { customer: updatedCustomer, updatedBy: updatedBy || req.actor?.email, actorRole });



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

        const actorRole = await resolveActorRole(updatedBy || req.actor?.email, updatedByRole || req.actor?.role);

        if (!actorRole) {

            return res.status(403).json({ success: false, message: 'Unauthorized access' });

        }



        const locked = Boolean(isLocked);

        const update = { isLocked: locked, updatedBy: updatedBy || req.actor?.email, updatedAt: new Date() };

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

        await logActivity('TOGGLE_STATUS', logType, entityId, entityName, updatedBy || req.actor?.email, actorRole, { isLocked: locked });

        emitRealtime(`${entityType}-lock-updated`, { entityType, entityId, entityName, isLocked: locked, updatedBy: updatedBy || req.actor?.email });



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

// --- 🏨 HOTEL PARTNER ROUTES ---

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

    try { res.json(await publicHotelQuery(Hotel.find({ isLocked: { $ne: true } }))); } catch (err) { res.status(500).send(err.message); }

});



// ⭐ GET HOTEL DETAILS BY EMAIL (for hotel dashboard)

app.get('/hotel-details/:ownerEmail', async (req, res) => {

    try {

        const hotel = await publicHotelQuery(Hotel.findOne({ ownerEmail: normalizeEmail(req.params.ownerEmail), isLocked: { $ne: true } }));

        if (!hotel) {

            return res.status(404).json({ success: false, message: 'Hotel not found' });

        }

        res.json({ success: true, hotel });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.post('/admin/add-room', verifyAdminOrAssistant('manageHotels'), async (req, res) => {

    try {

        const roomData = req.body;

        if (!roomData) {

            return res.status(400).json({ success: false, message: 'Room data is required' });

        }



        let hotel;

        if (req.session.role === 'hotel') {

            hotel = await Hotel.findOne({ ownerEmail: req.session.email });

        } else if (roomData.hotelId) {

            hotel = await Hotel.findById(roomData.hotelId);

        } else if (roomData.ownerEmail) {

            hotel = await Hotel.findOne({ ownerEmail: roomData.ownerEmail });

        }



        if (hotel) {

            const { ownerEmail, ...roomToAdd } = roomData;

            hotel.rooms.push(roomToAdd);

            await hotel.save();

            return res.status(200).json({ success: true, message: 'Room added to hotel.' });

        }



        return res.status(200).json({ success: true, message: 'Room data received by backend.' });

    } catch (err) {

        console.error('admin/add-room error:', err);

        res.status(500).json({ success: false, message: 'Unable to save room data' });

    }

});



// ---------------------------------------------------------

// --- 🛠️ PASSWORD RESET ---

// ---------------------------------------------------------



app.post(['/reset-password', '/api/reset-password'], async (req, res) => {

    try {

        const { email, newPassword, userType, resetToken } = req.body;

        if (!['user', 'hotel'].includes(userType)) {

            return res.status(400).json({ success: false, message: 'Valid account type is required' });

        }

        const normalizedEmail = normalizeEmail(email);

        const authorization = resetAuthorizationStore[normalizedEmail];

        const tokenHash = crypto.createHash('sha256').update(String(resetToken || '')).digest('hex');

        if (!authorization || authorization.expiresAt < Date.now() || tokenHash !== authorization.tokenHash) {

            return res.status(403).json({ success: false, message: 'Password reset authorization is invalid or expired' });

        }

        if (!isStrongEnoughPassword(newPassword)) {

            return res.status(400).json({ success: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });

        }

        let account = (userType === 'hotel') 

            ? await Hotel.findOne({ $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] })

            : await User.findOne({ email: normalizedEmail });



        if (!account) return res.status(404).json({ success: false, message: 'Account not found for this email address' });

        account.password = await bcrypt.hash(newPassword, 10);

        await account.save();

        delete resetAuthorizationStore[normalizedEmail];

        res.json({ success: true, message: 'Password reset successfully' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: 'Unable to reset password. Please try again.' });
    }

});



// ---------------------------------------------------------

// --- 📅 BOOKING ROUTES ---

// ---------------------------------------------------------



app.post('/api/bookings', requireSession(['customer', 'guest', 'mitra']), async (req, res) => {

    try {

        const customer = await User.findOne({ email: normalizeEmail(req.session.email) }).select('_id name fullName email phone');

        if (!customer) return res.status(404).json({ success: false, message: 'Customer account not found' });



        const requestedHotelId = String(req.body.hotelId || '').trim();

        const hotel = mongoose.Types.ObjectId.isValid(requestedHotelId)

            ? await Hotel.findById(requestedHotelId).select('hotelName')

            : await Hotel.findOne({ hotelName: String(req.body.hotelName || '').trim() }).select('hotelName');

        if (!hotel) return res.status(404).json({ success: false, message: 'Hotel not found' });



        const normalizedBookingPayload = {

            ...req.body,

            userId: customer._id,

            userEmail: customer.email,

            userName: customer.fullName || customer.name,

            hotelId: hotel._id,

            hotelName: hotel.hotelName

        };



        const validationError = validateBookingPayload(normalizedBookingPayload);

        if (validationError) return res.status(400).json({ success: false, message: validationError });

        const mitras = await User.find(mitraUserFilter);

        mitras.sort((a, b) => (b.experience || '').length - (a.experience || '').length);

        const assignedMitraUser = mitras[0] || null;

        const assignedMitra = assignedMitraUser ? assignedMitraUser.name : 'Auto-Assign';



        const bookingData = {

            ...normalizedBookingPayload,

            assignedMitra,

            assignedMitraId: assignedMitraUser?._id,

            mitraEmail: assignedMitraUser?.email || ''

        };

        const newBooking = new Booking(bookingData);

        await newBooking.save();

        emitRealtime('booking-created', { bookingId: newBooking._id, hotelName: newBooking.hotelName });

        emitRealtime('new-booking', { booking: newBooking, assignedMitra });



        res.status(200).json({ success: true, message: "Booking confirmed", assignedMitra });

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



const autoReleaseInterval = setInterval(() => {

    autoReleaseBookings().catch((err) => console.error('Auto-release error:', err));

}, 15 * 60 * 1000);

autoReleaseInterval.unref();



app.get('/admin/bookings', verifyAdmin, async (req, res) => {

    try {

        const bookings = await Booking.find().sort({ createdAt: -1 });

        res.json({ success: true, bookings });

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



// ⭐ GET MITRA ASSIGNED BOOKINGS

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

        res.json({ success: true, bookings });

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

// --- 🛡️ ASSISTANT MANAGEMENT SYSTEM (Admin Control) ---

// ---------------------------------------------------------



// Create a new Assistant

app.post('/admin/create-assistant', verifyAdmin, async (req, res) => {

    try {

        const { email, password, name, role, permissions, createdBy, createdByRole } = req.body;

        const cleanEmail = String(email || '').trim().toLowerCase();

        const cleanName = String(name || '').trim();

        const cleanPassword = String(password || '').trim();

        const cleanRole = ['assistant', 'manager'].includes(role) ? role : 'assistant';



        // ⭐ ADMIN ONLY - Assistants cannot create assistants

        if (createdByRole !== 'admin' || createdBy !== ADMIN_EMAIL) {

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

                manageBookings: false,

                viewReports: false,

                ...(permissions || {})

            },

            createdBy

        });



        await newAssistant.save();



        // Log activity

        await logActivity('CREATE', 'Assistant', newAssistant._id, cleanName, createdBy, 'admin');

        emitRealtime('assistant-created', { assistantId: newAssistant._id, name: newAssistant.name, email: newAssistant.email, createdBy });



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



// Assistant Login

app.post('/assistant-login', async (req, res) => {

    try {

        const { email, password } = req.body;

        const normalizedEmail = normalizeEmail(email);

        if (!isValidEmail(normalizedEmail) || !password) {

            return res.status(400).json({ success: false, message: 'Valid email and password are required' });

        }

        const assistant = await Assistant.findOne({ email: normalizedEmail });



        if (!assistant || !(await assistant.comparePassword(password))) {

            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        }



        if (!assistant.isActive) {

            return res.status(401).json({ success: false, message: 'Assistant account is inactive' });

        }



        // Update last login

        assistant.lastLogin = new Date();

        await assistant.save();



        res.status(200).json({

            success: true,

            message: 'Assistant login successful',

            sessionToken: createSessionToken('assistant', assistant.email),

            assistant: {

                _id: assistant._id,

                name: assistant.name,

                email: assistant.email,

                role: assistant.role,

                permissions: assistant.permissions

            }

        });

    } catch (err) {

        console.error('Assistant login error:', err);

        res.status(500).json({ success: false, message: err.message });

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



app.get('/admin/all-hotels', verifyAdminOrAssistant('manageHotels'), async (req, res) => {

    try {

        const hotels = await Hotel.find().select('-password');

        res.json({ success: true, hotels });

    } catch (err) {

        res.status(500).json({ success: false, message: err.message });

    }

});



app.get('/admin/all-customers', verifyAdminOrAssistant('manageCustomers'), async (req, res) => {

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



app.get('/admin/all-mitras', verifyAdminOrAssistant('manageMitra'), async (req, res) => {

    try {

        const mitras = await User.find(mitraUserFilter).select('-password');

        res.json({ success: true, mitras });

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



        // ⭐ ADMIN ONLY - Assistants cannot delete other assistants

        if (!verifyAdminOnly(deletedBy || req.actor?.email, deletedByRole || req.actor?.role)) {

            return res.status(403).json({ 

                success: false, 

                message: 'Only Admin can delete assistants permanently' 

            });

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

// --- 🏛️ BODHI PATH - SPIRITUAL & HERITAGE SYSTEM ---

// ---------------------------------------------------------



// Get all Bodhi Path entries (for frontend display)

app.get('/bodhi-path/all', async (req, res) => {

    try {

        const bodhiPaths = await BodhiPath.find();

        res.json({ success: true, bodhiPaths });

    } catch (err) {

        console.error('Error fetching Bodhi Path:', err);

        res.status(500).json({ success: false, message: err.message });

    }

});



// Admin fetch all Bodhi Path entries

app.get('/admin/all-bodhi-paths', verifyAdminOrAssistant(), async (req, res) => {

    try {

        const bodhiPaths = await BodhiPath.find();

        res.json({ success: true, bodhiPaths });

    } catch (err) {

        console.error('Error fetching admin bodhi paths:', err);

        res.status(500).json({ success: false, message: err.message });

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



app.post('/admin/bodhi-path/create', verifyAdminOrAssistant(), async (req, res) => {

    try {

        const { title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, createdBy, createdByRole } = req.body;



        const actorRole = await resolveActorRole(createdBy || req.actor?.email, createdByRole || req.actor?.role);

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

            updatedBy: createdBy || req.actor?.email

        });



        await newBodhiPath.save();

        await logActivity('CREATE', 'BodhiPath', newBodhiPath._id, title, createdBy || req.actor?.email, actorRole);

        emitRealtime('bodhi-path-created', { bodhiPath: newBodhiPath, createdBy: createdBy || req.actor?.email, actorRole });

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

app.put('/admin/bodhi-path/update', verifyAdminOrAssistant(), async (req, res) => {

    try {

        const { bodhiPathId, title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, updatedBy, updatedByRole } = req.body;



        const actorRole = await resolveActorRole(updatedBy || req.actor?.email, updatedByRole || req.actor?.role);

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

                updatedBy: updatedBy || req.actor?.email,

                updatedAt: new Date()

            },

            { new: true }

        );



        if (!updatedBodhiPath) {

            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });

        }



        // Log activity

        await logActivity('UPDATE', 'BodhiPath', bodhiPathId, title, updatedBy || req.actor?.email, actorRole, { 

            category, shortDescription 

        });

        emitRealtime('bodhi-path-updated', { bodhiPath: updatedBodhiPath, updatedBy: updatedBy || req.actor?.email, actorRole });



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

// --- 🏨 UPDATE HOTEL ENDPOINTS FOR NEW FIELDS ---

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

// --- 🔒 SECRET ADMIN PANEL ROUTES ---

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



// ⭐ ACTIVITY LOG ENDPOINT - Admin only

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

// --- 🌱 SEED BODHI PATH DATA (Run once to populate heritage data) ---

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

                entryFee: "₹50",

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



server.listen(PORT, () => { console.log(`Gyan Garbh Server Active on ${PORT} 🚀`); });
