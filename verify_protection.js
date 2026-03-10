
const API_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = `test_${Date.now()}@example.com`;

const test = async () => {
    console.log('--- Starting verification of Test Protection ---');

    let token = '';

    // 1. Register a new user
    try {
        console.log('\n1. Registering a new user...');
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: 'Test User',
                email: TEST_EMAIL,
                password: 'password'
            })
        });
        const regData = await regRes.json();

        if (regRes.status === 201) {
            console.log('   Registration successful.');
        } else {
            console.log('   Registration failed:', regData.message);
        }
    } catch (err) {
        console.log('   Registration Error:', err.message);
    }

    // 2. Login to get token
    try {
        console.log('\n2. Logging in to get token...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL, password: 'password' })
        });
        const loginData = await loginRes.json();

        if (loginRes.status === 200) {
            token = loginData.token;
            console.log('   Login successful, token acquired.');
        } else {
            console.log('   Login failed:', loginData.message);
        }
    } catch (err) {
        console.log('   Login Error:', err.message);
    }

    // 3. Test accessing protected route WITHOUT token
    try {
        console.log('\n3. Accessing /profile WITHOUT token...');
        const res = await fetch(`${API_URL}/profile`);
        const data = await res.json();
        console.log('   Response status (EXPECTED 401):', res.status);
        console.log('   Response data:', data);
    } catch (err) {
        console.log('   Error:', err.message);
    }

    // 4. Test accessing protected route WITH INVALID token
    try {
        console.log('\n4. Accessing /profile WITH INVALID token...');
        const res = await fetch(`${API_URL}/profile`, {
            headers: { 'Authorization': 'Bearer invalid_token' }
        });
        const data = await res.json();
        console.log('   Response status (EXPECTED 401):', res.status);
        console.log('   Response data:', data);
    } catch (err) {
        console.log('   Error:', err.message);
    }

    // 5. Test accessing protected route WITH VALID token
    if (token) {
        try {
            console.log('\n5. Accessing /profile WITH VALID token...');
            const res = await fetch(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('   Response status (EXPECTED 200):', res.status);
            console.log('   Response data (User Profile):', data);

            console.log('\n6. Accessing /test-protection WITH VALID token...');
            const testRes = await fetch(`${API_URL}/test-protection`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const testData = await testRes.json();
            console.log('   Response status (EXPECTED 200):', testRes.status);
            console.log('   Response data:', testData);
        } catch (err) {
            console.log('   Error:', err.message);
        }
    } else {
        console.log('\nSkipping valid token tests as login failed.');
    }

    console.log('\n--- Verification complete ---');
};

test();
