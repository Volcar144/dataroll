'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function DeviceCodeForm() {
  const [userCode, setUserCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Format the code: remove dashes and convert to uppercase
      const formattedCode = userCode.trim().replace(/-/g, '').toUpperCase();

      // Verify using Better Auth device endpoint
      const { data, error } = await authClient.device({
        query: { user_code: formattedCode },
      });

      if (data) {
        // Code is valid, redirect to approval page
        router.push(`/device/approve?user_code=${formattedCode}`);
      } else {
        const errorMsg = typeof error === 'object' && error ? (error.error_description || (error as any).message || 'Invalid or expired code') : 'Invalid or expired code';
        setError(errorMsg);
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="userCode" className="sr-only">
          Device Code
        </label>
        <input
          id="userCode"
          name="userCode"
          type="text"
          required
          autoFocus
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
          placeholder="Enter device code (e.g., ABCD-1234)"
          value={userCode}
          onChange={(e) => setUserCode(e.target.value)}
          maxLength={12}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading || !userCode}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}