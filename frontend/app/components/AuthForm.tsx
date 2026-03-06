'use client';

// frontend/src/app/components/AuthForm.tsx
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function AuthForm() {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    loginWithGoogle(); // redirects away — loading state is just visual polish
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center px-4">
      {/* Subtle background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e5e0 1px, transparent 1px),
            linear-gradient(to bottom, #e5e5e0 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.5,
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="bg-white rounded-2xl px-10 py-12"
          style={{ boxShadow: '0 2px 24px 0 rgba(0,0,0,0.07), 0 1px 2px 0 rgba(0,0,0,0.04)' }}
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-gray-950 rounded-2xl flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-10">
            <h1
              className="text-2xl text-gray-950 mb-2"
              style={{ fontFamily: '"Instrument Serif", Georgia, serif', letterSpacing: '-0.01em' }}
            >
              Screen Recorder
            </h1>
            <p className="text-[13px] text-gray-400 tracking-wide">
              Record · Transcribe · Share
            </p>
          </div>

          {/* Divider with label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300 uppercase tracking-widest">
              continue with
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ letterSpacing: '0.01em' }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              /* Google "G" SVG */
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Footer note */}
          <p className="text-center text-[11px] text-gray-300 mt-8 leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-gray-600 transition-colors">
              Terms
            </span>{' '}
            and{' '}
            <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-gray-600 transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>

        {/* Bottom label */}
        <p className="text-center text-[11px] text-gray-300 mt-6 tracking-wide">
          SCREEN RECORDER · {new Date().getFullYear()}
        </p>
      </div>

      {/* Load Instrument Serif from Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');
      `}</style>
    </div>
  );
}