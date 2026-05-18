const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const nodemailer = require('nodemailer'); 
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

// Models
const User = require('./models/User');
const Booking = require('./models/Booking'); 
const Hotel = require('./models/Hotel');
const Assistant = require('./models/Assistant');
const BodhiPath = require('./models/BodhiPath'); 

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
const activityLogSchema = new mongoose.Schema({
    actionType: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'TOGGLE_STATUS', 'SECURITY'], required: true },
    entityType: { type: String, enum: ['Hotel', 'BodhiPath', 'Assistant', 'Customer', 'Mitra', 'Security'], required: true },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String,
    performedBy: String, // email
    performedByRole: { type: String, enum: ['admin', 'assistant'], required: true },
    changes: mongoose.Schema.Types.Mixed, // What changed
    timestamp: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

dns.setServers(['1.1.1.1', '8.8.8.8']);
const app = express();
const PORT = 5000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '47696856369-b8pck7a7n94fsp303ltmmh5qpk4a55dh.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

app.use(cors());
app.use(express.json());

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

const verifyAdminOrAssistant = async (email, role) => {
    if (!email) return false;
    if ((!role || role === 'admin') && email === ADMIN_EMAIL) return true;
    if (role && role !== 'assistant') return false;
    return !!(await Assistant.exists({ email, isActive: true }));
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

let otpStore = {};
let pendingRegistrationStore = {};

// Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const dbURL = process.env.MONGODB_URI;
const mongooseMajorVersion = Number((mongoose.version || '0').split('.')[0]);
const mongooseOptions = {
    ...(mongooseMajorVersion < 6 ? { useNewUrlParser: true, useUnifiedTopology: true } : {}),
    serverSelectionTimeoutMS: 15000
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sirsonu122@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2026";

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

mongoose.connect(dbURL, mongooseOptions)
  .then(async () => {
      console.log('🚀 Connected to Gyan Garbh Cloud Database!');
      await ensureAdminUser();
  })
  .catch((err) => {
      console.error('Mongo Error:', err.message);
      console.error('Mongo Error Code:', err.code || 'NO_CODE');
      console.error('Mongo Error Stack:', err.stack);
      console.error("DATABASE ERROR: ", err.message);
  });

// ---------------------------------------------------------
// --- � ADMIN LOGIN ROUTE ---
// ---------------------------------------------------------

app.post('/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const adminUser = await User.findOne({ email, role: 'admin' });

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
            email: adminUser.email
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ---------------------------------------------------------
// --- �🔐 OTP ROUTES (Signup + Reset) ---
// ---------------------------------------------------------

app.post('/send-otp', async (req, res) => {
    const { email, isReset, name, password, role, experience, phone, address, hotelName } = req.body;
    try {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const cleanRole = role || 'guest';

        if (!normalizedEmail) {
            return res.status(400).json({ success: false, message: "Email is required." });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        const hotelExists = await Hotel.findOne({ $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] });

        if (!isReset) {
            const hasRequiredHotelDetails = cleanRole === 'hotel' && hotelName && password;
            const hasRequiredUserDetails = cleanRole !== 'hotel' && name && password && phone && address;

            if (!hasRequiredHotelDetails && !hasRequiredUserDetails) {
                return res.status(400).json({ success: false, message: "Please fill all signup details before sending OTP." });
            }
            if (userExists || hotelExists) {
                return res.status(400).json({ success: false, message: "Ye Email pehle se registered hai!" });
            }
            pendingRegistrationStore[normalizedEmail] = {
                name: name || hotelName,
                email: normalizedEmail,
                password,
                role: cleanRole,
                experience: experience || "",
                phone: phone || "",
                address: address || "",
                hotelName,
                ownerEmail: normalizedEmail,
                location: address || hotelName || "Bodhgaya"
            };
        } else {
            if (!userExists && !hotelExists) {
                return res.status(400).json({ success: false, message: "Ye Email hamare system mein nahi hai!" });
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
                    <p>Aapka 6-digit verification code hai:</p>
                    <h1 style="color: #ffc107; letter-spacing: 5px;">${otp}</h1>
                    <p>Ye code 5 minute ke liye valid hai.</p>
                   </div>`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP Sent" });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: "Email system error" });
    }
});

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const record = otpStore[normalizedEmail];

    if (!record || record.code != otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (record.expiresAt < Date.now()) {
        clearTimeout(record.timeoutId);
        delete otpStore[normalizedEmail];
        delete pendingRegistrationStore[normalizedEmail];
        return res.status(400).json({ success: false, message: 'OTP expired. Please request a new code.' });
    }

    clearTimeout(record.timeoutId);
    delete otpStore[normalizedEmail];
    const pending = pendingRegistrationStore[normalizedEmail];
    if (!pending) {
        return res.json({ success: true, message: 'OTP verified successfully.' });
    }

    delete pendingRegistrationStore[normalizedEmail];
    try {
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
            return res.json({ success: true, message: 'Hotel owner registered successfully.', role: 'hotel', name: pending.name, email: pending.email });
        }
        const hashedPassword = await bcrypt.hash(pending.password, 10);
        const newUser = new User({
            name: pending.name,
            email: pending.email,
            password: hashedPassword,
            role: pending.role || 'guest',
            experience: pending.experience,
            phone: pending.phone,
            address: pending.address
        });
        await newUser.save();
        return res.json({ success: true, message: 'Registered successfully.', role: newUser.role, name: newUser.name, email: newUser.email });
    } catch (err) {
        console.error('OTP registration error:', err);
        return res.status(500).json({ success: false, message: 'Registration failed after OTP verification.' });
    }
});

// ---------------------------------------------------------
// --- 👤 USER & MITRA ROUTES ---
// ---------------------------------------------------------

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, experience, phone, address } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail || !password || !name) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        const existingHotel = await Hotel.findOne({ $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] });
        if (existingUser || existingHotel) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'guest',
            experience: experience || "",
            phone: phone || "",
            address: address || ""
        });
        await newUser.save();
        res.status(200).json({ success: true, message: "Registered Successfully!", name: newUser.name, email: newUser.email, role: newUser.role });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: "Invalid Credentials" });
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid Credentials" });
        res.status(200).json({ success: true, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ⭐ GOOGLE LOGIN ENDPOINT
app.post('/google-login', async (req, res) => {
    try {
        const { idToken, name, email, googleId, photoURL } = req.body;
        let payload = null;

        if (idToken) {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        }

        const verifiedEmail = payload?.email || email;
        const verifiedName = payload?.name || name;
        const verifiedGoogleId = payload?.sub || googleId;
        const verifiedPhoto = payload?.picture || photoURL;

        if (!verifiedEmail) {
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
                name: user.name,
                email: user.email,
                role: user.role,
                message: 'Login successful'
            });
        } else {
            const newUser = new User({
                name: verifiedName || 'Google User',
                email: verifiedEmail,
                password: await bcrypt.hash(Math.random().toString(36), 10),
                role: 'guest',
                googleId: verifiedGoogleId,
                photoURL: verifiedPhoto,
                date: new Date()
            });
            await newUser.save();
            return res.status(201).json({
                success: true,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                message: 'Account created successfully'
            });
        }
    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ success: false, message: "Google login failed" });
    }
});

app.get('/all-mitras', async (req, res) => {
    try {
        const mitras = await User.find({ role: 'mitra', isLocked: { $ne: true } });
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

app.get('/admin/enquiries', async (req, res) => {
    try {
        const data = await safeSortQuery(Enquiry.find(), { createdAt: -1 });
        res.json(data);
    } catch (err) { res.status(500).json([]); }
});

// ---------------------------------------------------------
// --- 👑 ADMIN MANAGEMENT ROUTES ---
// ---------------------------------------------------------

// Get all users (customers, hotels, mitras) for admin panel
app.get('/admin/all-users', async (req, res) => {
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
            mitras: users.filter(user => user.role === 'mitra').map(mitra => ({
                _id: mitra._id,
                name: mitra.name,
                email: mitra.email,
                phone: mitra.phone,
                address: mitra.address,
                type: 'mitra',
                experience: mitra.experience,
                createdAt: mitra.date,
                updatedBy: mitra.updatedBy,
                isLocked: mitra.isLocked
            })),
            hotels: hotels.map(hotel => ({
                _id: hotel._id,
                name: hotel.hotelName,
                email: hotel.ownerEmail,
                phone: hotel.phone,
                address: hotel.address,
                type: 'hotel',
                location: hotel.location,
                roomRate: hotel.roomRate,
                rating: hotel.rating,
                createdAt: hotel.createdAt || new Date(),
                updatedBy: hotel.updatedBy,
                isLocked: hotel.isLocked
            })),
            guests: users.filter(user => user.role === 'guest').map(guest => ({
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
app.put('/admin/update-hotel', async (req, res) => {
    try {
        const { hotelId, hotelName, ownerEmail, phone, address, location, roomRate, rating, description, totalRooms, acRoomPrice, nonAcRoomPrice, facilities, imageUrl, imageUrl2, imageUrl3, updatedBy, updatedByRole } = req.body;

        const actorRole = await resolveActorRole(updatedBy, updatedByRole);
        if (!actorRole) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const updateData = { updatedBy, updatedAt: new Date() };
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
        await logActivity('UPDATE', 'Hotel', hotelId, updatedHotel.hotelName, updatedBy, actorRole, { 
            phone, address, location, rating, description, totalRooms 
        });

        res.json({ success: true, message: 'Hotel updated successfully', hotel: updatedHotel });
    } catch (err) {
        console.error('Error updating hotel:', err);
        res.status(500).json({ success: false, message: 'Error updating hotel' });
    }
});

// Create hotel (Admin / Assistant)
app.post('/admin/create-hotel', async (req, res) => {
    try {
        const { hotelName, ownerEmail, phone, address, location, roomRate, rating, description, totalRooms, acRoomPrice, nonAcRoomPrice, facilities, imageUrl, imageUrl2, imageUrl3, createdBy, createdByRole } = req.body;
        const actorRole = await resolveActorRole(createdBy, createdByRole);
        if (!actorRole) {
            await logSecurityEvent('Unauthorized Hotel Creation', hotelName || 'Unknown Hotel', createdBy || 'unknown', createdByRole || 'unknown', 'Actor cannot create hotels');
            return res.status(403).json({ success: false, message: 'Unauthorized to create hotels' });
        }

        const finalOwnerEmail = String(ownerEmail || '').trim().toLowerCase() || generateDefaultHotelEmail(hotelName);
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
            updatedBy: createdBy,
            updatedAt: new Date()
        });
        await newHotel.save();
        await logActivity('CREATE', 'Hotel', newHotel._id, hotelName, createdBy, actorRole);
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

// Create mitra (Admin / Assistant)
app.post('/admin/create-mitra', async (req, res) => {
    try {
        const { name, email, phone, address, experience, imageUrl, createdBy, createdByRole } = req.body;
        const actorRole = await resolveActorRole(createdBy, createdByRole);
        if (!actorRole) {
            await logSecurityEvent('Unauthorized Mitra Creation', name || 'Unknown Mitra', createdBy || 'unknown', createdByRole || 'unknown', 'Actor cannot create mitras');
            return res.status(403).json({ success: false, message: 'Unauthorized to create mitras' });
        }

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
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
            role: 'mitra',
            experience: experience || '',
            photoURL: imageUrl || placeholderPhoto,
            updatedBy: createdBy,
            updatedAt: new Date(),
            isLocked: false
        });

        await newMitra.save();
        await logActivity('CREATE', 'Mitra', newMitra._id, newMitra.name, createdBy, actorRole);

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
app.put('/hotel/update-details', async (req, res) => {
    try {
        const { ownerEmail, totalRooms, acRoomPrice, nonAcRoomPrice, description, facilities, imageUrl, imageUrl2, imageUrl3, distanceFromLandmark, gyanGarbhHighlights } = req.body;

        const updatedHotel = await Hotel.findOneAndUpdate(
            { ownerEmail },
            {
                totalRooms: Number(totalRooms),
                acRoomPrice: Number(acRoomPrice),
                nonAcRoomPrice: Number(nonAcRoomPrice),
                description: description || "",
                facilities: facilities || {},
                imageUrl: imageUrl || "",
                imageUrl2: imageUrl2 || "",
                imageUrl3: imageUrl3 || "",
                distanceFromLandmark: distanceFromLandmark || { value: 0, unit: 'km', landmark: 'Mahabodhi Temple' },
                gyanGarbhHighlights: gyanGarbhHighlights || ""
            },
            { new: true }
        );

        if (!updatedHotel) {
            return res.status(404).json({ success: false, message: 'Hotel not found' });
        }

        res.json({ success: true, message: 'Hotel details updated successfully', hotel: updatedHotel });
    } catch (err) {
        console.error('Error updating hotel details:', err);
        res.status(500).json({ success: false, message: 'Error updating hotel details' });
    }
});

// DELETE HOTEL - existing code follows
app.delete('/admin/delete-hotel', async (req, res) => {
    try {
        const { hotelId, deletedBy, deletedByRole } = req.body;

        // ⭐ ADMIN ONLY - Assistants cannot delete
        if (!verifyAdminOnly(deletedBy, deletedByRole)) {
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

        // Remove associated non-active bookings and orphaned logs
        await Booking.deleteMany({ hotelName: deletedHotel.hotelName });
        await ActivityLog.deleteMany({ $or: [ { entityType: 'Hotel', entityId: hotelId }, { performedBy: deletedHotel.ownerEmail }, { performedBy: deletedHotel.email }] });

        await logActivity('DELETE', 'Hotel', hotelId, deletedHotel.hotelName, deletedBy, deletedByRole);

        res.json({ success: true, message: 'Hotel deleted successfully and related records cleaned up' });
    } catch (err) {
        console.error('Error deleting hotel:', err);
        res.status(500).json({ success: false, message: 'Error deleting hotel' });
    }
});

// Update mitra details
app.put('/admin/update-mitra', async (req, res) => {
    try {
        const { mitraId, name, email, phone, address, experience, updatedBy, updatedByRole } = req.body;
        const actorRole = await resolveActorRole(updatedBy, updatedByRole);
        if (!actorRole) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const updatedMitra = await User.findByIdAndUpdate(
            mitraId,
            {
                name,
                email,
                phone,
                address,
                experience,
                updatedBy,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updatedMitra) {
            return res.status(404).json({ success: false, message: 'Mitra not found' });
        }

        await logActivity('UPDATE', 'Mitra', mitraId, updatedMitra.name, updatedBy, actorRole, { email, phone, address, experience });

        res.json({ success: true, message: 'Mitra updated successfully', mitra: updatedMitra });
    } catch (err) {
        console.error('Error updating mitra:', err);
        res.status(500).json({ success: false, message: 'Error updating mitra' });
    }
});

// Delete mitra
app.delete('/admin/delete-mitra', async (req, res) => {
    try {
        const { mitraId, deletedBy, deletedByRole } = req.body;
        if (!verifyAdminOnly(deletedBy, deletedByRole)) {
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

        await logActivity('DELETE', 'Mitra', mitraId, deletedMitra.name, deletedBy, deletedByRole);

        res.json({ success: true, message: 'Mitra deleted successfully and related records cleaned up' });
    } catch (err) {
        console.error('Error deleting mitra:', err);
        res.status(500).json({ success: false, message: 'Error deleting mitra' });
    }
});

// Update customer enquiry status
app.put('/admin/update-customer', async (req, res) => {
    try {
        const { customerId, customerName, customerEmail, customerPhone, status, updatedBy, updatedByRole } = req.body;
        const actorRole = await resolveActorRole(updatedBy, updatedByRole);
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
                updatedBy,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await logActivity('UPDATE', 'Customer', customerId, updatedCustomer.customerName, updatedBy, actorRole, { customerEmail, customerPhone, status });

        res.json({ success: true, message: 'Customer updated successfully', customer: updatedCustomer });
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(500).json({ success: false, message: 'Error updating customer' });
    }
});

// Delete customer enquiry
app.delete('/admin/delete-customer', async (req, res) => {
    try {
        const { customerId, deletedBy, deletedByRole } = req.body;
        if (!verifyAdminOnly(deletedBy, deletedByRole)) {
            return res.status(403).json({ success: false, message: 'Only Admin can delete customers permanently' });
        }

        const deletedCustomer = await Enquiry.findByIdAndDelete(customerId);

        if (!deletedCustomer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await logActivity('DELETE', 'Customer', customerId, deletedCustomer.customerName, deletedBy, deletedByRole);

        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ success: false, message: 'Error deleting customer' });
    }
});

app.put('/admin/toggle-lock', async (req, res) => {
    try {
        const { entityType, entityId, isLocked, updatedBy, updatedByRole } = req.body;
        const actorRole = await resolveActorRole(updatedBy, updatedByRole);
        if (!actorRole) {
            return res.status(403).json({ success: false, message: 'Unauthorized access' });
        }

        const locked = Boolean(isLocked);
        const update = { isLocked: locked, updatedBy, updatedAt: new Date() };
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
        await logActivity('TOGGLE_STATUS', logType, entityId, entityName, updatedBy, actorRole, { isLocked: locked });

        res.json({ success: true, message: `${entityName} ${locked ? 'locked' : 'unlocked'} successfully`, item: entity });
    } catch (err) {
        console.error('Toggle lock error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update guest (regular user)
app.put('/admin/update-guest', async (req, res) => {
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
app.delete('/admin/delete-guest', async (req, res) => {
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

app.post('/hotel-register', async (req, res) => {
    try {
        const { ownerEmail, hotelName, password, location } = req.body;
        const normalizedEmail = String(ownerEmail || '').trim().toLowerCase();

        if (!normalizedEmail || !password || !hotelName || !location) {
            return res.status(400).json({ success: false, message: 'Hotel name, owner email, password and location are required' });
        }

        const existingHotel = await Hotel.findOne({ $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] });
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingHotel || existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newHotel = new Hotel({ ...req.body, ownerEmail: normalizedEmail, password: hashedPassword });
        await newHotel.save();
        res.status(200).json({ success: true, hotelName: newHotel.hotelName, ownerEmail: newHotel.ownerEmail });
    } catch (err) { console.error('hotel-register error:', err); res.status(500).json({ success: false, message: 'Unable to register hotel' }); }
});

app.post('/hotel-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const hotel = await Hotel.findOne({ 
            $or: [{ ownerEmail: normalizedEmail }, { email: normalizedEmail }] 
        });

        if (hotel && await bcrypt.compare(password, hotel.password)) {
            res.status(200).json({ 
                success: true, 
                hotelName: hotel.hotelName, 
                ownerEmail: hotel.ownerEmail || hotel.email 
            });
        } else {
            await logSecurityEvent('Failed Login', normalizedEmail || 'unknown', normalizedEmail || 'unknown', 'admin', 'Hotel login attempted with invalid credentials');
            res.status(401).json({ success: false, message: "Invalid Credentials!" });
        }
    } catch (err) { console.error('hotel-login error:', err); res.status(500).json({ success: false, message: 'Unable to login' }); }
});

app.get('/all-hotels', async (req, res) => {
    try { res.json(await Hotel.find({ isLocked: { $ne: true } })); } catch (err) { res.status(500).send(err.message); }
});

// ⭐ GET HOTEL DETAILS BY EMAIL (for hotel dashboard)
app.get('/hotel-details/:ownerEmail', async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ ownerEmail: req.params.ownerEmail, isLocked: { $ne: true } });
        if (!hotel) {
            return res.status(404).json({ success: false, message: 'Hotel not found' });
        }
        res.json({ success: true, hotel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/admin/add-room', async (req, res) => {
    try {
        const roomData = req.body;
        if (!roomData) {
            return res.status(400).json({ success: false, message: 'Room data is required' });
        }

        let hotel;
        if (roomData.hotelId) {
            hotel = await Hotel.findById(roomData.hotelId);
        } else if (roomData.ownerEmail) {
            hotel = await Hotel.findOne({ ownerEmail: roomData.ownerEmail });
        }

        if (hotel) {
            // Remove ownerEmail from roomData before pushing
            const { ownerEmail, ...roomToAdd } = roomData;
            hotel.rooms.push(roomToAdd);
            await hotel.save();
            return res.status(200).json({ success: true, message: 'Room added to hotel.' });
        }

        // Demo fallback if no hotel found
        return res.status(200).json({ success: true, message: 'Room data received by backend.' });
    } catch (err) {
        console.error('admin/add-room error:', err);
        res.status(500).json({ success: false, message: 'Unable to save room data' });
    }
});

// ---------------------------------------------------------
// --- 🛠️ PASSWORD RESET ---
// ---------------------------------------------------------

app.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword, userType } = req.body;
        let account = (userType === 'hotel') 
            ? await Hotel.findOne({ $or: [{ ownerEmail: email }, { email: email }] }) 
            : await User.findOne({ email });

        if (!account) return res.status(404).json({ success: false });
        account.password = await bcrypt.hash(newPassword, 10);
        await account.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ---------------------------------------------------------
// --- 📅 BOOKING ROUTES ---
// ---------------------------------------------------------

app.post('/book-room', async (req, res) => {
    try {
        // Auto-assign the most experienced Mitra
        const mitras = await User.find({ role: 'mitra' });
        mitras.sort((a, b) => (b.experience || '').length - (a.experience || '').length);
        const assignedMitra = mitras.length > 0 ? mitras[0].name : 'Auto-Assign';
        
        const bookingData = { ...req.body, assignedMitra };
        const newBooking = new Booking(bookingData);
        await newBooking.save();
        res.status(200).json({ success: true, message: "Booking Successful", assignedMitra });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const mitras = await User.find({ role: 'mitra' });
        mitras.sort((a, b) => (b.experience || '').length - (a.experience || '').length);
        const assignedMitra = mitras.length > 0 ? mitras[0].name : 'Auto-Assign';

        const bookingData = { ...req.body, assignedMitra };
        const newBooking = new Booking(bookingData);
        await newBooking.save();

        res.status(200).json({ success: true, message: "Booking confirmed", assignedMitra });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/all-bookings', async (req, res) => {
    try { res.json(await safeSortQuery(Booking.find(), { createdAt: -1 })); } catch (err) { res.status(500).send(err.message); }
});

// ⭐ GET MITRA ASSIGNED BOOKINGS
app.get('/mitra-bookings/:mitraEmail', async (req, res) => {
    try {
        const bookings = await safeSortQuery(Booking.find({ 
            $or: [
                { assignedMitra: req.params.mitraEmail },
                { mitraEmail: req.params.mitraEmail }
            ]
        }), { createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/update-booking-status', async (req, res) => {
    try {
        const { bookingId, status } = req.body;
        await Booking.findByIdAndUpdate(bookingId, { status });
        res.status(200).json({ success: true, message: "Status Updated" });
    } catch (err) { res.status(500).send(err.message); }
});

// ---------------------------------------------------------
// --- 🛡️ ASSISTANT MANAGEMENT SYSTEM (Admin Control) ---
// ---------------------------------------------------------

// Create a new Assistant
app.post('/admin/create-assistant', async (req, res) => {
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
        const assistant = await Assistant.findOne({ email });

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
app.get('/admin/all-assistants', async (req, res) => {
    try {
        const assistants = await Assistant.find().select('-password');
        res.json({ success: true, assistants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/admin/all-hotels', async (req, res) => {
    try {
        const hotels = await Hotel.find().select('-password');
        res.json({ success: true, hotels });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/admin/all-customers', async (req, res) => {
    try {
        const customers = await Enquiry.find().sort({ createdAt: -1 });
        res.json({ success: true, customers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/admin/all-mitras', async (req, res) => {
    try {
        const mitras = await User.find({ role: 'mitra' }).select('-password');
        res.json({ success: true, mitras });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Assistant Details
app.put('/admin/update-assistant', async (req, res) => {
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
app.delete('/admin/delete-assistant', async (req, res) => {
    try {
        const { assistantId, deletedBy, deletedByRole } = req.body;

        // ⭐ ADMIN ONLY - Assistants cannot delete other assistants
        if (deletedByRole !== 'admin' || deletedBy !== ADMIN_EMAIL) {
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

        await logActivity('DELETE', 'Assistant', assistantId, deletedAssistant.name, deletedBy, deletedByRole);

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
app.get('/admin/all-bodhi-paths', async (req, res) => {
    try {
        const bodhiPaths = await BodhiPath.find();
        res.json({ success: true, bodhiPaths });
    } catch (err) {
        console.error('Error fetching admin bodhi paths:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get specific Bodhi Path entry
app.get('/bodhi-path/:id', async (req, res) => {
    try {
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

app.post('/admin/bodhi-path/create', async (req, res) => {
    try {
        const { title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, createdBy, createdByRole } = req.body;

        const actorRole = await resolveActorRole(createdBy, createdByRole);
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
            updatedBy: createdBy
        });

        await newBodhiPath.save();
        await logActivity('CREATE', 'BodhiPath', newBodhiPath._id, title, createdBy, actorRole);
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
app.put('/admin/bodhi-path/update', async (req, res) => {
    try {
        const { bodhiPathId, title, category, shortDescription, fullDescription, significance, historicalFacts, location, imageUrl, images, bestTimeToVisit, visitingHours, entryFee, estimatedVisitTime, relatedTemples, spiritualSignificance, updatedBy, updatedByRole } = req.body;

        const actorRole = await resolveActorRole(updatedBy, updatedByRole);
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
                updatedBy,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updatedBodhiPath) {
            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });
        }

        // Log activity
        await logActivity('UPDATE', 'BodhiPath', bodhiPathId, title, updatedBy, actorRole, { 
            category, shortDescription 
        });

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
app.delete('/admin/bodhi-path/delete', async (req, res) => {
    try {
        const { bodhiPathId, deletedBy, deletedByRole } = req.body;
        if (!verifyAdminOnly(deletedBy, deletedByRole)) {
            return res.status(403).json({ success: false, message: 'Only Admin can delete Bodhi Path entries permanently' });
        }

        const deletedBodhiPath = await BodhiPath.findByIdAndDelete(bodhiPathId);

        if (!deletedBodhiPath) {
            return res.status(404).json({ success: false, message: 'Bodhi Path entry not found' });
        }

        await logActivity('DELETE', 'BodhiPath', bodhiPathId, deletedBodhiPath.title, deletedBy, deletedByRole);

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
// --- 🏨 UPDATE HOTEL ENDPOINTS FOR NEW FIELDS ---
// ---------------------------------------------------------

// Update hotel with distance from landmark and highlights
app.put('/hotel/update-distance-highlights', async (req, res) => {
    try {
        const { ownerEmail, distanceFromLandmark, gyanGarbhHighlights } = req.body;

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
app.get('/admin/dashboard', async (req, res) => {
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
app.get('/admin/activity-log', async (req, res) => {
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

app.post('/admin/seed-heritage-data', async (req, res) => {
    try {
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

app.listen(PORT, () => { console.log(`Gyan Garbh Server Active on ${PORT} 🚀`); });
