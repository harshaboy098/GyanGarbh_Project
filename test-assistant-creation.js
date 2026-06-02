const http = require('http');

// Test data for creating Supriya assistant
const testData = {
    name: 'Supriya',
    email: 'supriya@gyangarbh.com',
    password: 'Supriya@2026',
    role: 'assistant',
    permissions: {
        manageHotels: true,
        manageCustomers: true,
        manageMitra: true,
        manageBookings: false,
        viewReports: false
    },
    createdBy: 'sirsonu122@gmail.com',
    createdByRole: 'admin'
};

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/admin/create-assistant',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n✅ RESPONSE STATUS:', res.statusCode);
        console.log('✅ RESPONSE:', JSON.stringify(JSON.parse(data), null, 2));
        
        if (res.statusCode === 201 && JSON.parse(data).success) {
            console.log('\n🎉 SUCCESS! Assistant Supriya created!');
            console.log('Email:', testData.email);
            console.log('Password:', testData.password);
        } else {
            console.log('\n❌ FAILED TO CREATE ASSISTANT');
        }
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.error('❌ REQUEST ERROR:', error.message);
    process.exit(1);
});

console.log('📤 Sending request to create assistant "Supriya"...');
console.log('📋 Request Body:', JSON.stringify(testData, null, 2));

req.write(JSON.stringify(testData));
req.end();
