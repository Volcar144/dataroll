import { login } from './dist/index.js';

async function testLogin() {
  try {
    console.log('Testing login...');
    const result = await login({ baseUrl: 'https://gbjxo-172-166-151-115.a.free.pinggy.link/api' });
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

testLogin();