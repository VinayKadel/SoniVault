'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Mail, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked =
    local.length > 2
      ? local[0] + '***' + local[local.length - 1]
      : local[0] + '***';
  return `${masked}@${domain}`;
}

export default function VerifyOTPContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const name = params.get('name') || '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [timeLeft, setTimeLeft] = useState(600);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setError('Code expired. Please request a new one.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleVerify = useCallback(
    async (code: string) => {
      if (loading || success) return;
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, name }),
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Invalid code.');
          setDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          setLoading(false);
          return;
        }

        setSuccess(true);
        const result = await signIn('credentials', {
          email,
          otpVerified: 'true',
          redirect: false,
        });

        if (result?.ok) {
          router.push('/');
        } else {
          setError('Sign-in failed. Please try again.');
          setSuccess(false);
          setLoading(false);
        }
      } catch {
        setError('Network error. Please try again.');
        setLoading(false);
      }
    },
    [email, name, loading, success, router]
  );

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newDigits.every((d) => d !== '') && value) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      handleVerify(pasted);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.success) {
        setResendCooldown(60);
        setTimeLeft(600);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.error || 'Failed to resend code.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-8 animate-fade-in">
      <div className="flex justify-center">
        <Logo size="lg" showText={false} />
      </div>

      <div className="bg-sv-surface border border-sv-border rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-sv-text-primary">
            Check your email
          </h1>
          <div className="flex items-center gap-2 text-sm text-sv-text-muted">
            <Mail className="h-4 w-4 shrink-0" />
            <span>
              Code sent to{' '}
              <span className="text-sv-text-secondary font-medium">
                {maskEmail(email)}
              </span>
            </span>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-sv-text-muted">Code expires in</span>
          <span
            className={cn(
              'text-sm font-mono font-semibold tabular-nums',
              timeLeft < 60 ? 'text-sv-danger' : 'text-sv-text-secondary'
            )}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-2 justify-between" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              id={`otp-digit-${i}`}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              autoFocus={i === 0}
              disabled={loading || success || timeLeft === 0}
              className={cn(
                'w-12 h-14 text-center text-xl font-bold rounded-xl',
                'bg-sv-bg border-2 text-sv-text-primary',
                'focus:outline-none transition-all duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                success
                  ? 'border-sv-success'
                  : error
                  ? 'border-sv-danger'
                  : digit
                  ? 'border-sv-accent'
                  : 'border-sv-border focus:border-sv-accent'
              )}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sv-danger/10 border border-sv-danger/20">
            <AlertCircle className="h-4 w-4 text-sv-danger shrink-0 mt-0.5" />
            <p className="text-sm text-sv-danger">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-sv-success/10 border border-sv-success/20">
            <CheckCircle className="h-4 w-4 text-sv-success shrink-0" />
            <p className="text-sm text-sv-success">Verified! Signing you in…</p>
          </div>
        )}

        {!success && (
          <Button
            type="button"
            loading={loading}
            disabled={digits.some((d) => !d) || timeLeft === 0}
            onClick={() => handleVerify(digits.join(''))}
            className="w-full"
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </Button>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-sv-text-muted">Didn't receive it?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className={cn(
              'flex items-center gap-1.5 font-medium transition-colors cursor-pointer',
              resendCooldown > 0 || resendLoading
                ? 'text-sv-text-muted cursor-not-allowed'
                : 'text-sv-accent hover:text-sv-accent-hover'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resendLoading
              ? 'Sending…'
              : 'Resend code'}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-sv-text-muted">
        Wrong email?{' '}
        <button
          onClick={() => router.push('/login')}
          className="text-sv-accent hover:text-sv-accent-hover font-medium cursor-pointer"
        >
          Go back
        </button>
      </p>
    </div>
  );
}
