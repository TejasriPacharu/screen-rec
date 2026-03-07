'use client';

// frontend/src/app/telegram-setup/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function TelegramSetupPage() {
  const router                          = useRouter();
  const [step, setStep]                 = useState<'intro' | 'input'>('intro');
  const [chatId, setChatId]             = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const proceed = () => router.replace('/');

  const handleSave = async () => {
    if (!chatId.trim()) { setError('Please enter your Chat ID.'); return; }
    if (!/^\d+$/.test(chatId.trim())) { setError('Chat ID must be a number — get it from @userinfobot.'); return; }

    setIsLoading(true);
    setError(null);
    try {
      await apiClient.registerTelegram(chatId.trim());
      proceed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center px-4">
      {/* Subtle grid background */}
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
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 24px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)' }}
        >
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-400" />

          <div className="px-8 py-10">

            {step === 'intro' ? (
              <>
                {/* Icon */}
                <div className="flex justify-center mb-7">
                  <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.018 9.51c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 14.493l-2.95-.924c-.642-.204-.654-.642.136-.953l11.527-4.448c.535-.194 1.003.131.69.08z"/>
                    </svg>
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center mb-7">
                  <h1
                    className="text-2xl text-gray-950 mb-2"
                    style={{ fontFamily: '"Instrument Serif", Georgia, serif', letterSpacing: '-0.01em' }}
                  >
                    Enable Notifications
                  </h1>
                  <p className="text-[13px] text-gray-400 leading-relaxed">
                    If a cloud upload fails, we'll save your recording to Google Drive
                    and notify you instantly on Telegram.
                  </p>
                </div>

                {/* Feature pills */}
                <div className="space-y-2 mb-8">
                  {[
                    { icon: '☁️', label: 'Cloud fails', desc: 'Google Drive fallback triggers automatically' },
                    { icon: '📁', label: 'File saved', desc: 'Recording saved to your Google Drive' },
                    { icon: '🔔', label: 'You\'re notified', desc: 'Instant Telegram message with file name' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <p className="text-[12px] font-medium text-gray-700">{item.label}</p>
                        <p className="text-[11px] text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <button
                  onClick={() => setStep('input')}
                  className="w-full py-3 bg-gray-950 text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-[0.99] transition-all mb-3"
                >
                  Set up Telegram →
                </button>
                <button
                  onClick={proceed}
                  className="w-full py-2.5 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <>
                {/* Back */}
                <button
                  onClick={() => setStep('intro')}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-7 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="text-center mb-7">
                  <h1
                    className="text-2xl text-gray-950 mb-2"
                    style={{ fontFamily: '"Instrument Serif", Georgia, serif', letterSpacing: '-0.01em' }}
                  >
                    Your Chat ID
                  </h1>
                  <p className="text-[13px] text-gray-400 leading-relaxed">
                    Follow these steps to get your Telegram Chat ID
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-6">
                  {[
                    { n: '1', text: 'Open Telegram → search @userinfobot' },
                    { n: '2', text: 'Send /start — copy the number next to "Id:"' },
                    { n: '3', text: <>Search <span className="font-medium text-gray-800">@screenrec_alerts_bot</span> → hit Start</> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.n}
                      </span>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 5685298004"
                  value={chatId}
                  onChange={(e) => { setChatId(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all font-mono tracking-wider mb-2"
                />
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                {/* Actions */}
                <button
                  onClick={handleSave}
                  disabled={isLoading || !chatId.trim()}
                  className="w-full py-3 bg-gray-950 text-white text-sm font-medium rounded-xl hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {isLoading ? 'Saving…' : 'Save & Enable Alerts'}
                </button>
                <button
                  onClick={proceed}
                  className="w-full py-2.5 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-300 mt-6 tracking-wide">
          SCREEN RECORDER · {new Date().getFullYear()}
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap');
      `}</style>
    </div>
  );
}