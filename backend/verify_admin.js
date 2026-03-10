
const API_URL = 'http://127.0.0.1:5000/api';
const ADMIN_EMAIL = `admin_${Date.now()}@example.com`;
const USER_EMAIL = `user_${Date.now()}@example.com`;

const test = async () => {
    console.log('--- Starting verification of Admin Routes and Role-Based Access ---');

    let adminToken = '';
    let userToken = '';

    // 1. Register a super-admin
    try {
        console.log('\n1. Registering a super-admin user...');
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Super Admin',
                email: ADMIN_EMAIL,
                password: 'password',
                role: 'super-admin'
            })
        });
        const data = await res.json();
        if (res.status === 201) {
            adminToken = data.token;
            console.log('   Super-admin registered and token acquired.');
        } else {
            console.log('   Registration failed:', data.message);
        }
    } catch (err) {
        console.log('   Error:', err.message);
    }

    // 2. Register a regular user
    try {
        console.log('\n2. Registering a regular user...');
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Regular User',
                email: USER_EMAIL,
                password: 'password',
                role: 'user'
            })
        });
        const data = await res.json();
        if (res.status === 201) {
            userToken = data.token;
            console.log('   Regular user registered and token acquired.');
        } else {
            console.log('   Registration failed:', data.message);
        }
    } catch (err) {
        console.log('   Error:', err.message);
    }

    // 3. Test accessing /api/admin/test WITHOUT token
    try {
        console.log('\n3. Accessing /api/admin/test WITHOUT token...');
        const res = await fetch(`${API_URL}/admin/test`);
        const data = await res.json();
        console.log('   Response status (EXPECTED 401):', res.status);
    } catch (err) {
        console.log('   Error:', err.message);
    }

    // 4. Test accessing /api/admin/test WITH USER token
    if (userToken) {
        try {
            console.log('\n4. Accessing /api/admin/test WITH USER token (non-admin)...');
            const res = await fetch(`${API_URL}/admin/test`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const data = await res.json();
            console.log('   Response status (EXPECTED 403):', res.status);
            console.log('   Response message:', data.message);
        } catch (err) {
            console.log('   Error:', err.message);
        }
    }

    // 5. Test accessing /api/admin/test WITH SUPER-ADMIN token
    if (adminToken) {
        try {
            console.log('\n5. Accessing /api/admin/test WITH SUPER-ADMIN token...');
            const res = await fetch(`${API_URL}/admin/test`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            const data = await res.json();
            console.log('   Response status (EXPECTED 200):', res.status);
            console.log('   Response message:', data.message);
        } catch (err) {
            console.log('   Error:', err.message);
        }
    }

    console.log('\n--- Verification complete ---');
};

test();
