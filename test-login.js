import { login } from './packages/dataroll-sdk/dist/index.js';

async function testLogin() {
  try {
    console.log('Testing login...');
    const result = await login({ baseUrl: 'https://fun-five-psi.vercel.app/api' });
    console.log('Login successful:', result);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

testLogin();