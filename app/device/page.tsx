import { Suspense } from 'react';
import DeviceCodeForm from './device-code-form';

export default function DevicePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Device Authorization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the code from your CLI application
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <DeviceCodeForm />
        </Suspense>
      </div>
    </div>
  );
}