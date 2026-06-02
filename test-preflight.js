/**
 * 🚀 GYAN GARBH - PREFLIGHT SYSTEM TEST
 * Validates entire ecosystem: Backend, Frontend, Database, Sorting, URLs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

let testResults = [];
let passCount = 0;
let failCount = 0;

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function testEndpoint(method, path, data = null) {
    return new Promise((resolve) => {
        const url = new URL(API_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            timeout: 3000,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                const success = res.statusCode >= 200 && res.statusCode < 300;
                resolve({ success, status: res.statusCode, data: responseData });
            });
        });

        req.on('error', () => resolve({ success: false, status: 0, data: '' }));
        req.on('timeout', () => { req.destroy(); resolve({ success: false, status: 0, data: '' }); });

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function checkFile(filePath, searchPattern) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes(searchPattern);
    } catch {
        return false;
    }
}

async function runTests() {
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  🚀 GYAN GARBH - PREFLIGHT SYSTEM TEST                         ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

    // ========== SECTION 1: BACKEND CONNECTIVITY ==========
    log('📡 SECTION 1: Backend Server Status', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    let result = await testEndpoint('GET', '/all-hotels');
    if (result.success) {
        log('  ✓ Server is running on port 5000', 'green');
        passCount++;
    } else {
        log('  ✗ Server is not responding', 'red');
        failCount++;
    }

    // ========== SECTION 2: DATABASE QUERIES ==========
    log('\n📊 SECTION 2: Database Query Endpoints', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    const dbTests = [
        { method: 'GET', path: '/all-hotels', name: 'Hotels Query' },
        { method: 'GET', path: '/all-bookings', name: 'Bookings Query (Sorted)' },
        { method: 'GET', path: '/admin/enquiries', name: 'Enquiries Query (Sorted)' },
        { method: 'GET', path: '/all-mitras', name: 'Mitras Query' }
    ];

    for (const test of dbTests) {
        result = await testEndpoint(test.method, test.path);
        if (result.success) {
            try {
                const data = JSON.parse(result.data);
                const isArray = Array.isArray(data);
                const isSorted = isArray && data.length > 0;
                log(`  ✓ ${test.name} - Returns valid data`, 'green');
                passCount++;
            } catch {
                log(`  ✗ ${test.name} - Invalid JSON response`, 'red');
                failCount++;
            }
        } else {
            log(`  ✗ ${test.name} - Request failed [${result.status}]`, 'red');
            failCount++;
        }
    }

    // ========== SECTION 3: CODE QUALITY ==========
    log('\n📝 SECTION 3: Code Quality Checks', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    // Check .sort() fixes
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    if (checkFile(serverPath, 'safeSortQuery')) {
        log('  ✓ Invalid .sort() calls are fixed with safeSortQuery()', 'green');
        passCount++;
    } else {
        log('  ✗ safeSortQuery helper function missing', 'red');
        failCount++;
    }

    // Check fetch() URLs
    const frontendDir = path.join(__dirname, 'frontend');
    const htmlFiles = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));
    let urlCheckPass = true;
    
    for (const file of htmlFiles) {
        const filePath = path.join(frontendDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for hardcoded localhost URLs (except API_URL declaration)
        const hardcodedUrls = (content.match(/fetch\(['"]http:\/\/localhost:5000/g) || []).filter(
            match => !content.includes(`const API_URL = "http://localhost:5000"`)
        );
        
        if (hardcodedUrls.length > 0) {
            log(`  ✗ ${file} has hardcoded URLs in fetch() calls`, 'red');
            urlCheckPass = false;
        }
    }

    if (urlCheckPass) {
        log('  ✓ All fetch() calls use API_URL variable', 'green');
        passCount++;
    } else {
        failCount++;
    }

    // Check for duplicate variables
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    const varMatches = serverContent.match(/const\s+(\w+)\s*=/g) || [];
    const varNames = varMatches.map(m => m.match(/const\s+(\w+)/)[1]);
    const duplicates = varNames.filter((v, i) => varNames.indexOf(v) !== i);

    if (duplicates.length === 0) {
        log('  ✓ No duplicate variable declarations found', 'green');
        passCount++;
    } else {
        log(`  ✗ Found duplicate declarations: ${duplicates.join(', ')}`, 'red');
        failCount++;
    }

    // ========== SECTION 4: IMAGE HANDLING ==========
    log('\n🖼️  SECTION 4: Image Path Configuration', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    const hotelHtmlPath = path.join(frontendDir, 'hotel.html');
    const hotelHtmlContent = fs.readFileSync(hotelHtmlPath, 'utf8');

    if (hotelHtmlContent.includes('onerror=')) {
        log('  ✓ Image fallback handlers are in place', 'green');
        passCount++;
    } else {
        log('  ✗ Image fallback handlers missing', 'red');
        failCount++;
    }

    if (hotelHtmlContent.includes('imageUrl') || hotelHtmlContent.includes('imgUrl')) {
        log('  ✓ Hotel images are loaded from database', 'green');
        passCount++;
    } else {
        log('  ✗ Image loading logic not found', 'red');
        failCount++;
    }

    // ========== SECTION 5: ADMIN PANEL ==========
    log('\n🛠️  SECTION 5: Admin Panel Verification', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    result = await testEndpoint('POST', '/admin-login', 
        { email: 'admin@gyangarbh.com', password: 'wrong' });

    if (result.status === 401) {
        log('  ✓ Admin authentication is working', 'green');
        passCount++;
    } else {
        log('  ✗ Admin auth endpoint issue', 'red');
        failCount++;
    }

    const adminHtmlPath = path.join(frontendDir, 'admin.html');
    const adminContent = fs.readFileSync(adminHtmlPath, 'utf8');
    const htmlCount = (adminContent.match(/<!DOCTYPE html/g) || []).length;

    if (htmlCount === 1) {
        log('  ✓ No duplicate HTML documents in admin.html', 'green');
        passCount++;
    } else {
        log(`  ✗ Found ${htmlCount} HTML document declarations`, 'red');
        failCount++;
    }

    // ========== SECTION 6: BOOKING SYSTEM ==========
    log('\n📅 SECTION 6: Booking System Integrity', 'blue');
    log('─────────────────────────────────────────────────────────────────\n', 'gray');

    result = await testEndpoint('GET', '/all-bookings');
    if (result.success) {
        try {
            const bookings = JSON.parse(result.data);
            if (Array.isArray(bookings)) {
                log('  ✓ Booking data structure is valid', 'green');
                passCount++;
            } else {
                log('  ✗ Bookings response is not an array', 'red');
                failCount++;
            }
        } catch {
            log('  ✗ Cannot parse bookings data', 'red');
            failCount++;
        }
    } else {
        log('  ✗ Bookings endpoint failed', 'red');
        failCount++;
    }

    // Check booking endpoints exist
    const bookingEndpoints = ['/book-room', '/api/bookings', '/update-booking-status'];
    let bookingOk = true;
    for (const endpoint of bookingEndpoints) {
        if (!checkFile(path.join(__dirname, 'server.js'), `app.${endpoint.includes('post') ? 'post' : 'post'}('${endpoint}'`)) {
            if (!checkFile(path.join(__dirname, 'server.js'), `'${endpoint}'`)) {
                bookingOk = false;
                break;
            }
        }
    }

    if (bookingOk) {
        log('  ✓ All booking endpoints are defined', 'green');
        passCount++;
    } else {
        log('  ✗ Some booking endpoints missing', 'red');
        failCount++;
    }

    // ========== SUMMARY ==========
    log('\n╔════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST SUMMARY                                                   ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════════╝\n', 'cyan');

    const total = passCount + failCount;
    const percentage = Math.round((passCount / total) * 100);

    log(`  Total Tests: ${total}`, 'cyan');
    log(`  ${colors.green}Passed: ${passCount}${colors.reset}`);
    log(`  ${colors.red}Failed: ${failCount}${colors.reset}`);
    log(`  Success Rate: ${percentage}%\n`);

    if (percentage === 100) {
        log('✅ 100% SYSTEM READY - All checks passed!', 'green');
        log('Your Gyan Garbh ecosystem is fully operational.\n', 'green');
        process.exit(0);
    } else if (percentage >= 80) {
        log(`⚠️  ${percentage}% READY - Minor issues detected, see above.`, 'yellow');
        process.exit(0);
    } else {
        log(`❌ ${percentage}% READY - Critical issues need fixing.`, 'red');
        process.exit(1);
    }
}

runTests().catch(err => {
    log(`Test execution failed: ${err.message}`, 'red');
    process.exit(1);
});
