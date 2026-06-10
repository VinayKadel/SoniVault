'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to send OTP. Please try again.');
        return;
      }

      // Redirect to verify page
      router.push(`/verify-otp?email=${encodeURIComponent(email.trim())}&name=${encodeURIComponent(name.trim())}`);
    } catch {
      setError('Network error. Please check your connection and try again.');
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
            Enter your email and we'll send you a verification code.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-name"
              className="block text-sm font-medium text-sv-text-secondary"
            >
              Your name <span className="text-sv-text-muted font-normal">(optional, for first-time users)</span>
            </label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoComplete="name"
              className={cn(
                'w-full h-11 px-4 rounded-lg text-sm',
                'bg-sv-bg border border-sv-border',
                'text-sv-text-primary placeholder:text-sv-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-sv-accent/50 focus:border-sv-accent',
                'transition-all duration-150'
              )}
            />
          </div>

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
            {loading ? 'Sending code…' : 'Send verification code'}
          </Button>
        </form>

        {/* Footer note */}
        <p className="text-xs text-sv-text-muted text-center leading-relaxed">
          No password required. We'll send a 6-digit code to your email.
        </p>
      </div>
    </div>
  );
}
