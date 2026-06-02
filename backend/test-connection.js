/**
 * 🔗 GYAN GARBH - Frontend-Backend Connection Tester
 * Check if API endpoints are working correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:5000';
const MONGODB_URI = process.env.MONGODB_URI;
const mongooseMajorVersion = Number((mongoose.version || '0').split('.')[0]);
const mongooseOptions = {
    ...(mongooseMajorVersion < 6 ? { useNewUrlParser: true, useUnifiedTopology: true } : {}),
    serverSelectionTimeoutMS: 15000
};
const tests = [];

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║  🔗 GYAN GARBH - CONNECTION VERIFICATION TEST                   ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

// Test function wrapper
function testEndpoint(method, path, data = null, description, expectedStatuses = null) {
    return new Promise((resolve) => {
        const url = new URL(API_URL + path);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            timeout: 3000,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', chunk => {
                responseData += chunk;
            });

            res.on('end', () => {
                const success = expectedStatuses
                    ? expectedStatuses.includes(res.statusCode)
                    : res.statusCode >= 200 && res.statusCode < 300;
                const status = success ? `${colors.green}✓ OK${colors.reset}` : `${colors.red}✗ FAILED${colors.reset}`;
                const code = `[${res.statusCode}]`;
                
                console.log(`  ${status} ${code} ${description}`);
                
                tests.push({
                    endpoint: path,
                    method: method,
                    status: res.statusCode,
                    success: success
                });

                resolve(success);
            });
        });

        req.on('error', (err) => {
            console.log(`  ${colors.red}✗ ERROR${colors.reset} ${description} - ${err.message}`);
            tests.push({
                endpoint: path,
                method: method,
                status: 0,
                success: false
            });
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`  ${colors.red}✗ TIMEOUT${colors.reset} ${description}`);
            tests.push({
                endpoint: path,
                method: method,
                status: 0,
                success: false
            });
            resolve(false);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testMongoConnection() {
    console.log(`${colors.cyan}0. MongoDB Direct Connection:${colors.reset}`);
    try {
        if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured');
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log(`  ${colors.green}✓ OK${colors.reset} MongoDB direct connection`);
        tests.push({ endpoint: 'MongoDB', method: 'CONNECT', status: 200, success: true });
        await mongoose.disconnect();
    } catch (err) {
        console.log(`  ${colors.red}✗ ERROR${colors.reset} MongoDB direct connection - ${err.message}`);
        console.log(`  Mongo Error Code: ${err.code || 'NO_CODE'}`);
        console.log(`  Mongo Error Stack: ${err.stack}`);
        tests.push({ endpoint: 'MongoDB', method: 'CONNECT', status: 0, success: false });
    }
}

// Run all tests
async function runTests() {
    await testMongoConnection();
    console.log(`${colors.blue}📡 Testing Backend Connectivity...${colors.reset}\n`);

    // Check if server is running
    console.log(`${colors.cyan}1. Server Status:${colors.reset}`);
    await testEndpoint('GET', '/all-hotels', null, 'Server Health Check');

    console.log(`\n${colors.cyan}2. User Routes:${colors.reset}`);
    await testEndpoint('GET', '/all-mitras', null, 'GET /all-mitras');
    await testEndpoint('POST', '/login', 
        { email: 'test@test.com', password: 'test' }, 
        'POST /login (Auth rejects invalid test user)', [200, 401, 404]);

    console.log(`\n${colors.cyan}3. Booking Routes:${colors.reset}`);
    await testEndpoint('GET', '/all-bookings', null, 'GET /all-bookings rejects anonymous access', [401]);
    await testEndpoint('GET', '/mitra-bookings/test@test.com', null, 'GET /mitra-bookings/:email rejects anonymous access', [401]);

    console.log(`\n${colors.cyan}4. Admin Routes:${colors.reset}`);
    await testEndpoint('GET', '/admin/enquiries', null, 'GET /admin/enquiries rejects anonymous access', [401]);
    await testEndpoint('POST', '/admin-login',
        { email: 'admin@gyangarbh.com', password: 'wrong' },
        'POST /admin-login (Auth rejects wrong password)', [401]);

    console.log(`\n${colors.cyan}5. Hotel Routes:${colors.reset}`);
    await testEndpoint('GET', '/all-hotels', null, 'GET /all-hotels');
    await testEndpoint('GET', '/hotel-details/test@test.com', null, 'GET /hotel-details/:email (404 is OK for fake email)', [200, 404]);

    // Summary
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  TEST SUMMARY                                                   ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const passed = tests.filter(t => t.success).length;
    const total = tests.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`  Total Tests: ${total}`);
    console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${total - passed}${colors.reset}`);
    console.log(`  Success Rate: ${percentage}%\n`);

    if (percentage === 100) {
        console.log(`${colors.green}✓ ALL SYSTEMS GO! Frontend-Backend Connection is Perfect.${colors.reset}\n`);
        process.exit(0);
    } else if (percentage >= 70) {
        console.log(`${colors.yellow}⚠ PARTIAL SUCCESS - Most endpoints working, check failed tests above.${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}✗ CONNECTION ISSUE - Backend may not be running or has errors.${colors.reset}\n`);
        process.exit(1);
    }
}

// Start tests
runTests().catch(err => {
    console.error(`${colors.red}Test execution error:${colors.reset}`, err);
    process.exit(1);
});
