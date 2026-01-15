import { login } from './dist/index.js';

async function testLogin() {
  try {
    console.log('Testing login...');
    const result = await login({ baseUrl: 'http://localhost:3000/api' });
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

testLogin();