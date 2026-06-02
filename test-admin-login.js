const http = require('http');
const querystring = require('querystring');

// Test: Try admin login with various combinations
const tests = [
    {
        name: 'Admin Login (Primary)',
        email: 'sirsonu122@gmail.com',
        password: 'Admin@2026'
    },
    {
        name: 'Test: Verify Admin User Exists by Testing Other Routes',
        email: 'sirsonu122@gmail.com',
        password: 'Admin@2026'
    }
];

function testAdminLogin(email, password) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ email, password });
        
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
                try {
                    const parsed = JSON.parse(response);
                    console.log(`\n📧 Email: ${email}`);
                    console.log(`🔐 Password: ${password}`);
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`📋 Response:`, JSON.stringify(parsed, null, 2));
                    
                    if (parsed.success) {
                        console.log('✅ LOGIN SUCCESSFUL!');
                    } else {
                        console.log('❌ Login failed:', parsed.message);
                    }
                } catch (e) {
                    console.log('❌ Parse Error:', e.message);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.log(`❌ Request Error: ${e.message}`);
            resolve();
        });
        
        req.write(data);
        req.end();
    });
}

async function runTests() {
    console.log('\n🔐 ADMIN LOGIN VERIFICATION\n');
    
    for (const test of tests) {
        await testAdminLogin(test.email, test.password);
    }
    
    console.log('\n📝 NOTES:');
    console.log('   - Admin user should be created automatically on first DB connection');
    console.log('   - Check if ensureAdminUser() ran successfully during server startup');
    console.log('   - Default password from env: Admin@2026');
    
    process.exit(0);
}

runTests();
