const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB URI from backend/.env
const MONGO_URI = 'mongodb+srv://yesmukeshhere_db_user:GyanGarbh2026@gyangrabh.ylamayo.mongodb.net/GYANGRABH?retryWrites=true&w=majority&appName=GYANGRABH';

const User = require('./models/User');

const ADMIN_EMAIL = 'yesmukeshhere@gmail.com';

async function resetPassword() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to Database successfully!');

        const newPassword = 'NewAdminPassword123!';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedAdmin = await User.findOneAndUpdate(
            { email: ADMIN_EMAIL.toLowerCase(), role: 'admin' },
            { password: hashedPassword },
            { new: true }
        );

        if (updatedAdmin) {
            console.log('\n=============================================');
            console.log('SUCCESS: Admin Password Reset Successfully!');
            console.log('Admin Email:', ADMIN_EMAIL);
            console.log('New Password is:', newPassword);
            console.log('=============================================\n');
        } else {
            console.log('\nError: Admin email not found in database. Check the email address.');
        }
    } catch (err) {
        console.error('\nConnection Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

resetPassword();
