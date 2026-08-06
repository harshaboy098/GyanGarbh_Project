const dns = require('dns');
const path = require('path');

dns.setServers(['8.8.8.8', '8.8.4.4']);
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const Assistant = require('./models/Assistant');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const ASSISTANT_EMAIL = 'rr4050440@gmail.com';

async function main() {
    if (!MONGO_URI) {
        throw new Error('Missing MongoDB connection string. Set MONGODB_URI in backend/.env.');
    }

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected.');

    await Assistant.deleteOne({ email: ASSISTANT_EMAIL });
    console.log(`Existing assistant removed for ${ASSISTANT_EMAIL}.`);

    const assistant = new Assistant({
        name: 'Mukesh Assistant',
        email: ASSISTANT_EMAIL,
        password: 'AssistentMukesh@456',
        role: 'assistant',
        isActive: true,
        createdBy: process.env.ADMIN_EMAIL || 'sirsonu122@gmail.com',
        permissions: {
            manageHotels: true,
            manageCustomers: true,
            manageMitra: true,
            manageMitras: true,
            viewReports: true
        }
    });

    await assistant.save();
    console.log(`Assistant created: ${assistant.name} <${assistant.email}>`);
}

main()
    .catch((err) => {
        console.error('Assistant seed failed:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
