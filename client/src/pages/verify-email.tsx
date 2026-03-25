import React from 'react';
import { useLocation } from 'wouter';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useWebSocketStore } from '@/stores/websocket-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck, Mail, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

type Step = 'email' | 'otp';

const RESEND_COOLDOWN = 30; // seconds
const MAX_ATTEMPTS = 5;

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = React.useState<Step>(() =>
    sessionStorage.getItem('pending_verify_email') ? 'otp' : 'email'
  );
  const [email, setEmail] = React.useState(
    () => sessionStorage.getItem('pending_verify_email') || ''
  );
  const [otp, setOtp] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [attempts, setAttempts] = React.useState(0);

  // Countdown timer for resend button
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      await authApi.resendOtp(email);
      sessionStorage.setItem('pending_verify_email', email);
      setStep('otp');
      setCountdown(RESEND_COOLDOWN);
      toast({ title: 'OTP Sent!', description: `Check your inbox at ${email}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;

    try {
      setIsLoading(true);
      const response = await authApi.verifyOtp(email, otp);

      useAuthStore.setState({ currentUser: response.user });
      useWebSocketStore.getState().connectWebSocket();

      sessionStorage.removeItem('pending_verify_email');
      toast({ title: '✅ Email Verified!', description: 'Welcome to Nexus Chat!' });
      setLocation('/chat');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      toast({ title: 'Verification Failed', description: message, variant: 'destructive' });

      // If max attempts, go back to email step to get a new OTP
      if (newAttempts >= MAX_ATTEMPTS || message.toLowerCase().includes('too many')) {
        setOtp('');
        setStep('email');
        sessionStorage.removeItem('pending_verify_email');
        setAttempts(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      setIsResending(true);
      await authApi.resendOtp(email);
      setCountdown(RESEND_COOLDOWN);
      setAttempts(0);
      setOtp('');
      toast({ title: 'OTP Resent', description: `New code sent to ${email}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend OTP';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <AnimatePresence mode="wait">
          {/* ─── SCREEN 1: Enter Email ─── */}
          {step === 'email' && (
            <motion.div
              key="email-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="glass-card border-none shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-display font-bold">Verify Your Email</CardTitle>
                    <CardDescription>
                      Enter your email address and we'll send you a verification code.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="h-12 bg-white/50 dark:bg-black/20"
                        disabled={isLoading}
                        autoFocus
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-base shadow-lg shadow-primary/20"
                      disabled={isLoading || !email.trim()}
                    >
                      {isLoading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...</>
                        : <> Send Verification Code <ArrowRight className="ml-2 w-4 h-4" /></>
                      }
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setLocation('/auth')}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        ← Back to login
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── SCREEN 2: Enter OTP ─── */}
          {step === 'otp' && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="glass-card border-none shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-6">
                  <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <MailCheck className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-display font-bold">Enter Code</CardTitle>
                    <CardDescription>
                      We sent a 6-digit code to<br />
                      <span className="font-semibold text-foreground">{email}</span>
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleOtpSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input
                        id="otp"
                        placeholder="000000"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-14 text-center text-2xl tracking-[0.6em] font-mono bg-white/50 dark:bg-black/20"
                        maxLength={6}
                        disabled={isLoading}
                        autoFocus
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Expires in 5 min</span>
                        {attempts > 0 && (
                          <span className="text-destructive font-medium">
                            {MAX_ATTEMPTS - attempts} attempt(s) left
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-base shadow-lg shadow-primary/20"
                      disabled={isLoading || otp.length < 6}
                    >
                      {isLoading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                        : 'Verify & Continue'
                      }
                    </Button>

                    <div className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || countdown > 0}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                        {countdown > 0 ? `Resend in ${countdown}s` : "Didn't receive it? Resend"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        ← Use a different email
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
