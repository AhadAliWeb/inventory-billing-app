const http = require('http');

// Test if backend is running
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

console.log('🔍 Testing backend API connection...');

const req = http.request(options, (res) => {
  console.log(`✅ Backend is responding! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('🎉 LOGIN SUCCESSFUL!');
        console.log('User:', response.user.username);
        console.log('Token received:', response.token ? 'Yes' : 'No');
      } else {
        console.log('❌ Login failed:', response.error);
      }
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('❌ Backend connection failed:', e.message);
  console.log('Make sure the backend server is running on port 3001');
  process.exit(1);
});

req.write(postData);
req.end();
