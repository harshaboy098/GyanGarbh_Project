const http = require('http');

const data = JSON.stringify({
    email: 'sirsonu122@gmail.com',
    password: 'MUMMYPAPA@456'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/admin-login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let response = '';
    res.on('data', chunk => response += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(response);
        console.log('\n✅ ADMIN LOGIN TEST');
        console.log('─'.repeat(50));
        console.log(`Email: sirsonu122@gmail.com`);
        console.log(`Password: MUMMYPAPA@456`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Success: ${parsed.success}`);
        
        if (parsed.success) {
            console.log('\n🎉 ADMIN LOGIN SUCCESSFUL!');
            console.log(`Name: ${parsed.name}`);
            console.log(`Email: ${parsed.email}`);
            console.log(`Role: ${parsed.role}`);
        } else {
            console.log(`\n❌ Error: ${parsed.message}`);
        }
        
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
});

req.write(data);
req.end();
