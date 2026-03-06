'use client';

// frontend/src/app/auth/callback/page.tsx
// Google redirects to /auth/callback?token=xxx after successful OAuth
// This page picks up the token, stores it, then sends user to the app.

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function AuthCallback() {
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