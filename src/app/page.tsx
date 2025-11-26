'use client';

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type View = 'signin' | 'signup' | 'forgot';

export default function HomePage() {
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (view === 'signin') {
        const {  error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Optional: You can still fetch role if needed later
        // For now, since you only have /dashboard/user → go straight there
        // This full reload ensures the server picks up the new session cookie
        window.location.href = '/dashboard/user';

        // Alternative (also reliable):
        // router.push('/dashboard/user');
        // router.refresh();
        return; // Stop execution — we're redirecting
      }

      if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        setMessage({
          text: 'Check your email for the confirmation link!',
          type: 'success',
        });
        setView('signin');
        setPassword(''); // Clear password
      }

      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        setMessage({
          text: 'Password reset link sent to your email!',
          type: 'success',
        });
      }
    } catch (err) {
      setMessage({
        text: (err as Error).message || 'An error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-4xl font-bold text-center mb-8 text-emerald-400">
          WanderBot
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />

          {view !== 'forgot' && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required={view === 'signin' || view === 'signup'}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-400 transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold flex justify-center items-center gap-2 transition duration-200"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading
              ? 'Please wait...'
              : view === 'signin'
              ? 'Sign In'
              : view === 'signup'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 text-center text-sm font-medium p-3 rounded-lg ${
              message.type === 'success'
                ? 'text-emerald-400 bg-emerald-900/20'
                : 'text-red-400 bg-red-900/20'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-gray-400 space-y-3">
          {view === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setView('forgot');
                  setMessage(null);
                }}
                className="text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
              <div>
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setMessage(null);
                    setPassword('');
                  }}
                  className="text-emerald-400 font-medium hover:underline"
                >
                  Sign up
                </button>
              </div>
            </>
          )}

          {(view === 'signup' || view === 'forgot') && (
            <button
              type="button"
              onClick={() => {
                setView('signin');
                setMessage(null);
                setPassword('');
              }}
              className="text-emerald-400 hover:underline"
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </main>
  );
}