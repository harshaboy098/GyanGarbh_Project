const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

dns.setServers(['8.8.8.8', '8.8.4.4']);
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');

const Assistant = require('./models/Assistant.js');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const ADMIN_EMAIL = 'sirsonu122@gmail.com';
const ADMIN_PASSWORD = 'GyanGarbh@123';

async function debugAdminAuth() {
    try {
        if (!MONGO_URI) {
            throw new Error('Missing MongoDB connection string. Set MONGODB_URI in backend/.env.');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        let user = await Assistant.findOne({ email: ADMIN_EMAIL });

        if (!user) {
            console.log('Assistant user not found:', ADMIN_EMAIL);
            process.exitCode = 1;
            return;
        }

        console.log('Stored password hash:', user.password);

        let passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, user.password);
        console.log('bcrypt.compare result:', passwordMatches);

        if (!passwordMatches) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

            await Assistant.updateOne(
                { email: ADMIN_EMAIL },
                { $set: { password: hashedPassword } }
            );

            console.log('Password hash updated directly with Assistant.updateOne.');

            user = await Assistant.findOne({ email: ADMIN_EMAIL });
            console.log('Updated password hash:', user.password);

            passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, user.password);
            console.log('bcrypt.compare result after update:', passwordMatches);
        }
    } catch (err) {
        console.error('Debug admin auth failed:', err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

debugAdminAuth();
