'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

type View = 'signin' | 'signup' | 'forgot';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Fetch user role from your "users" table
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = profile?.role || 'user';

        // Redirect based on role
        router.push(role === 'admin' ? '/dashboard/admin' : '/dashboard/user');
        router.refresh(); // This triggers server revalidation → session is now available server-side
      }

      else if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' 
              ? `${window.location.origin}/` 
              : 'http://localhost:3000/',
          },
        });

        if (error) throw error;

        setMessage({
          text: 'Check your email! We sent a confirmation link.',
          type: 'success',
        });
        setView('signin');
      }

      else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/reset-password`
            : 'http://localhost:3000/reset-password',
        });

        if (error) throw error;

        setMessage({
          text: 'Password reset link sent to your email!',
          type: 'success',
        });
      }
    } catch (err) {
      setMessage({
        text: ((err as Error).message) || 'An error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          WanderBot
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {view !== 'forgot' && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required={true}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-70 text-white font-bold flex justify-center items-center gap-2 transition"
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
            className={`mt-4 text-center text-sm ${
              message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
          {view === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => setView('forgot')}
                className="text-emerald-400 hover:underline"
              >
                Forgot password?
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => setView('signup')}
                  className="text-emerald-400 hover:underline"
                >
                  Create account
                </button>
              </div>
            </>
          )}
          {(view === 'signup' || view === 'forgot') && (
            <button
              type="button"
              onClick={() => setView('signin')}
              className="text-emerald-400 hover:underline"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </main>
  );
}