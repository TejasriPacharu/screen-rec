'use client';

import { useAuth } from '@/lib/auth-context';
import ScreenRecorder from './components/ScreenRecorder';
import AuthForm from './components/AuthForm';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <main>
      <ScreenRecorder />
    </main>
  );
}