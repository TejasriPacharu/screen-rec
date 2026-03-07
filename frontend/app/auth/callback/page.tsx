'use client';

// frontend/src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';

function CallbackHandler() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      router.replace('/?error=login_failed');
      return;
    }

    apiClient.setToken(token);
    // Full reload so AuthProvider re-initialises and fetches /auth/me
    window.location.href = '/';
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 font-light tracking-wide">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 font-light tracking-wide">Loading…</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}