'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password: password.trim(),
      });

      if (res?.error) {
        setError(res.error);
        if (res.error.includes('Forgot Password')) {
           // We could redirect to forgot password, but showing the message is fine
           toast.error(res.error);
        }
        return;
      }

      if (res?.ok) {
        toast.success('Successfully logged in!');
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 animate-fade-in">
      {/* Logo */}
      <div className="flex justify-center">
        <Logo size="lg" showText={false} />
      </div>

      {/* Card */}
      <div className="bg-sv-surface border border-sv-border rounded-2xl p-8 shadow-2xl space-y-6">
        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-sv-text-primary">
            Sign in to SONIVAULT
          </h1>
          <p className="text-sm text-sv-text-muted">
            Enter your email and password to access your vault.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-sv-text-secondary"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sv-text-muted pointer-events-none" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                required
                className={cn(
                  'w-full h-11 pl-11 pr-4 rounded-lg text-sm',
                  'bg-sv-bg border border-sv-border',
                  'text-sv-text-primary placeholder:text-sv-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                  'transition-all duration-150',
                  error && 'border-sv-danger focus:ring-sv-danger/50 focus:border-sv-danger'
                )}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-sv-text-secondary"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-sv-accent hover:text-sv-accent-light transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sv-text-muted pointer-events-none" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className={cn(
                  'w-full h-11 pl-11 pr-4 rounded-lg text-sm',
                  'bg-sv-bg border border-sv-border',
                  'text-sv-text-primary placeholder:text-sv-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                  'transition-all duration-150',
                  error && 'border-sv-danger focus:ring-sv-danger/50 focus:border-sv-danger'
                )}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sv-danger/10 border border-sv-danger/20">
              <AlertCircle className="h-4 w-4 text-sv-danger shrink-0 mt-0.5" />
              <p className="text-sm text-sv-danger">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            loading={loading}
            className="w-full"
            icon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Footer note */}
        <p className="text-sm text-sv-text-muted text-center">
          Don't have an account?{' '}
          <Link href="/register" className="text-sv-accent hover:text-sv-accent-light font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
