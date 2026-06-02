#!/usr/bin/env node

const http = require('http');

let results = [];

function logTest(status, message) {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${message}`);
    results.push({ status, message });
}

function request(method, path, body = null) {
    return new Promise((resolve) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 5000,
            path,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', chunk => response += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(response);
                    resolve({ status: res.statusCode, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, body: null });
                }
            });
        });

        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        if (data) req.write(data);
        req.end();
    });
}

async function runTests() {
    console.clear();
    console.log('🧪 GYAN GARBH COMPLETE SYSTEM TEST\n');
    console.log('═'.repeat(60));

    // Test 1: Admin Login
    console.log('\n📋 TEST 1: Admin Login\n');
    let res = await request('POST', '/admin-login', {
        email: 'sirsonu122@gmail.com',
        password: 'MUMMYPAPA@456'
    });
    if (res.status === 200 && res.body.success) {
        logTest('PASS', 'Admin login successful');
    } else {
        logTest('FAIL', 'Admin login failed');
    }

    // Test 2: List Assistants
    console.log('\n📋 TEST 2: List All Assistants\n');
    res = await request('GET', '/admin/all-assistants');
    if (res.status === 200 && res.body.assistants?.length > 0) {
        logTest('PASS', `Assistants loaded: ${res.body.assistants.length} found`);
        if (res.body.assistants.some(a => a.name === 'Supriya')) {
            logTest('PASS', 'Supriya assistant found in database');
        }
    } else {
        logTest('FAIL', 'Failed to load assistants');
    }

    // Test 3: Assistant Login
    console.log('\n📋 TEST 3: Assistant (Supriya) Login\n');
    res = await request('POST', '/assistant-login', {
        email: 'supriya@gyangarbh.com',
        password: 'Supriya@2026'
    });
    if (res.status === 200 && res.body.success) {
        logTest('PASS', 'Supriya login successful');
    } else {
        logTest('FAIL', 'Supriya login failed');
    }

    // Test 4: List All Users (Hotels, Mitras, Customers)
    console.log('\n📋 TEST 4: Load All Users (Hotels, Mitras, Customers)\n');
    res = await request('GET', '/admin/all-users');
    if (res.status === 200) {
        if (res.body.hotels?.length > 0) {
            logTest('PASS', `Hotels loaded: ${res.body.hotels.length}`);
        }
        if (res.body.mitras?.length > 0) {
            logTest('PASS', `Mitras loaded: ${res.body.mitras.length}`);
        }
        if (res.body.customers?.length > 0) {
            logTest('PASS', `Customers loaded: ${res.body.customers.length}`);
        }
    } else {
        logTest('FAIL', 'Failed to load users');
    }

    // Test 5: Bodhi Path Access
    console.log('\n📋 TEST 5: Bodhi Path Management\n');
    res = await request('GET', '/bodhi-path/all');
    if (res.status === 200) {
        logTest('PASS', `Bodhi Paths accessible: ${res.body.bodhiPaths?.length || 0} entries`);
    } else {
        logTest('FAIL', 'Failed to access Bodhi Paths');
    }

    // Test 6: Edit Hotel (Admin action)
    console.log('\n📋 TEST 6: Edit Hotel (Simulated)\n');
    if (res.body.hotels && res.body.hotels.length > 0) {
        const hotelId = res.body.hotels[0]._id;
        res = await request('PUT', '/admin/update-hotel', {
            hotelId,
            hotelName: 'Updated Hotel Name',
            phone: '+91 9876543210',
            address: 'Test Address',
            updatedBy: 'sirsonu122@gmail.com',
            updatedByRole: 'admin'
        });
        if (res.status === 200 && res.body.success) {
            logTest('PASS', 'Hotel edit endpoint working (Admin)');
        } else {
            logTest('FAIL', 'Hotel edit failed');
        }
    }

    // Test 7: Lock/Unlock Functionality
    console.log('\n📋 TEST 7: Lock/Unlock System\n');
    res = await request('GET', '/admin/all-users');
    if (res.body.hotels && res.body.hotels.length > 0) {
        const hotelId = res.body.hotels[0]._id;
        res = await request('PUT', '/admin/toggle-lock', {
            entityType: 'hotel',
            entityId: hotelId,
            isLocked: true,
            updatedBy: 'sirsonu122@gmail.com',
            updatedByRole: 'admin'
        });
        if (res.status === 200 && res.body.success) {
            logTest('PASS', 'Lock/Unlock functionality working');
        }
    }

    // Test 8: Delete Restrictions (Admin Only)
    console.log('\n📋 TEST 8: Delete Restrictions\n');
    res = await request('GET', '/admin/all-users');
    if (res.body.hotels && res.body.hotels.length > 0) {
        const hotelId = res.body.hotels[0]._id;
        // Attempt assistant delete (should fail)
        res = await request('DELETE', '/admin/delete-hotel', {
            hotelId,
            deletedBy: 'supriya@gyangarbh.com',
            deletedByRole: 'assistant'
        });
        if (res.status === 403 || (res.body && !res.body.success)) {
            logTest('PASS', 'Assistant cannot delete (Correctly Denied)');
        } else {
            logTest('FAIL', 'Delete restriction not working for assistant');
        }
    }

    // Final Summary
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    const passed = results.filter(r => r.status === 'PASS').length;
    const total = results.length;
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
        console.log('\n🎉 ALL TESTS PASSED! SYSTEM IS READY!\n');
        console.log('📝 Next Steps:');
        console.log('   1. Open admin-fixed.html in browser');
        console.log('   2. Open admin-secret-panel.html for admin functions');
        console.log('   3. Test with:');
        console.log('      - Admin: sirsonu122@gmail.com / MUMMYPAPA@456');
        console.log('      - Assistant: supriya@gyangarbh.com / Supriya@2026');
    } else {
        console.log('\n⚠️  Some tests failed. Check logs above.\n');
    }

    process.exit(0);
}

runTests();
