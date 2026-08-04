const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

dns.setServers(['8.8.8.8', '8.8.4.4']);
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const Assistant = require('./models/Assistant.js');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const ADMIN_EMAIL = 'sirsonu122@gmail.com';
const ADMIN_PASSWORD = 'GyanGarbh@123';

async function createAdminDirect() {
    try {
        if (!MONGO_URI) {
            throw new Error('Missing MongoDB connection string. Set MONGODB_URI in backend/.env.');
        }

        const rolePath = Assistant.schema.path('role');
        if (rolePath && !rolePath.enumValues.includes('admin')) {
            rolePath.enumValues.push('admin');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        await Assistant.deleteOne({ email: ADMIN_EMAIL });

        const admin = new Assistant({
            name: 'Admin',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: 'admin',
            createdBy: 'direct-script',
            permissions: {
                manageHotels: true,
                manageCustomers: true,
                manageMitra: true,
                manageBookings: true,
                viewReports: true
            },
            isActive: true
        });

        await admin.save();

        console.log('Direct admin Assistant created successfully.');
        console.log('Email:', ADMIN_EMAIL);
        console.log('Password:', ADMIN_PASSWORD);
    } catch (err) {
        console.error('Failed to create direct admin:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createAdminDirect();
