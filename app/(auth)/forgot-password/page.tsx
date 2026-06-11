'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 -> Step 2
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: 'User' }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to send OTP. Please try again.');
        return;
      }

      toast.success('Verification code sent to your email.');
      setStep(2);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Invalid or expired code.');
        return;
      }

      setStep(3);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Finish
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          code: otp.trim()
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Password reset failed. Please try again.');
        return;
      }

      toast.success('Password reset successfully!');
      
      // Auto-login
      const signInRes = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password: password.trim(),
      });

      if (signInRes?.ok) {
        router.push('/');
        router.refresh();
      } else {
        router.push('/login');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <Logo size="lg" showText={false} />
      </div>

      <div className="bg-sv-surface border border-sv-border rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-sv-text-primary">
            Reset Password
          </h1>
          <p className="text-sm text-sv-text-muted">
            {step === 1 && 'Enter your email to receive a recovery code.'}
            {step === 2 && `We've sent a 6-digit code to ${email}`}
            {step === 3 && 'Secure your account with a new password.'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-sm font-medium text-sv-text-secondary">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sv-text-muted pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className={cn(
                    'w-full h-11 pl-11 pr-4 rounded-lg text-sm bg-sv-bg border border-sv-border',
                    'text-sv-text-primary placeholder:text-sv-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                    'transition-all duration-150'
                  )}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sv-danger/10 border border-sv-danger/20">
                <AlertCircle className="h-4 w-4 text-sv-danger shrink-0 mt-0.5" />
                <p className="text-sm text-sv-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              icon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {loading ? 'Sending code…' : 'Send Recovery Code'}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label htmlFor="reset-otp" className="block text-sm font-medium text-sv-text-secondary">
                6-digit Code
              </label>
              <input
                id="reset-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoFocus
                className={cn(
                  'w-full h-11 px-4 text-center tracking-[0.5em] text-lg rounded-lg bg-sv-bg border border-sv-border',
                  'text-sv-text-primary placeholder:text-sv-text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                  'transition-all duration-150'
                )}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sv-danger/10 border border-sv-danger/20">
                <AlertCircle className="h-4 w-4 text-sv-danger shrink-0 mt-0.5" />
                <p className="text-sm text-sv-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              icon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </Button>
            
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-sv-text-muted hover:text-sv-text-primary transition-colors mt-2"
            >
              Go back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label htmlFor="reset-password" className="block text-sm font-medium text-sv-text-secondary">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sv-text-muted pointer-events-none" />
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  autoFocus
                  className={cn(
                    'w-full h-11 pl-11 pr-4 rounded-lg text-sm bg-sv-bg border border-sv-border',
                    'text-sv-text-primary placeholder:text-sv-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                    'transition-all duration-150'
                  )}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sv-danger/10 border border-sv-danger/20">
                <AlertCircle className="h-4 w-4 text-sv-danger shrink-0 mt-0.5" />
                <p className="text-sm text-sv-danger">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              icon={!loading ? <CheckCircle2 className="h-4 w-4" /> : undefined}
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </Button>
          </form>
        )}

        <p className="text-sm text-sv-text-muted text-center">
          Remembered your password?{' '}
          <Link href="/login" className="text-sv-accent hover:text-sv-accent-light font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
