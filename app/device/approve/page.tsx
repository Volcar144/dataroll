'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function DeviceApprovePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userCode = searchParams.get('user_code');

  useEffect(() => {
    if (!userCode) {
      setError('No device code provided');
      setLoading(false);
      return;
    }

    const approveDevice = async () => {
      try {
        const response = await authClient.device.code.approve({
          query: { user_code: userCode },
        });

        if (response.data) {
          setSuccess(true);
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          setError('Failed to approve device');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to approve device');
      } finally {
        setLoading(false);
      }
    };

    approveDevice();
  }, [userCode, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Approving Device...
            </h2>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Device Approval Failed
            </h2>
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/device')}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Device Approved!
            </h2>
            <div className="mt-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">
                Your device has been successfully approved. You can now use the CLI to access DataRoll.
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-500">
                Redirecting to dashboard...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}