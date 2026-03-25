import React from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const login = useAuthStore(state => state.login);
  const register = useAuthStore(state => state.register);
  const isLoading = useAuthStore(state => state.isLoading);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);

  React.useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'login') {
        await login({ username, password });
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in.',
        });
        setLocation('/chat');
      } else {
        await register({ username, email, password });
        toast({
          title: 'Check your email!',
          description: 'An OTP verification code has been sent to your inbox.',
        });
        setLocation('/verify-email');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      // If login is rejected because email not verified, redirect user to OTP page
      if (message.includes('403') || message.toLowerCase().includes('not verified')) {
        toast({
          title: 'Email not verified',
          description: 'Redirecting you to enter your OTP.',
          variant: 'destructive',
        });
        setLocation('/verify-email');
      }
      console.error('Auth error:', err);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setUsername('');
    setEmail('');
    setPassword('');
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="glass-card border-none shadow-2xl overflow-hidden">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-display font-bold">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Enter your credentials to access the chat'
                  : 'Sign up to start chatting'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 bg-white/50 dark:bg-black/20"
                    required
                    disabled={isLoading}
                  />
                </div>

                {mode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 bg-white/50 dark:bg-black/20"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-white/50 dark:bg-black/20"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                  {mode === 'register' && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base shadow-lg shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading
                    ? mode === 'login' ? 'Logging in...' : 'Creating account...'
                    : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    disabled={isLoading}
                  >
                    {mode === 'login'
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </motion.form>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="justify-center text-sm text-muted-foreground pb-6">
            By joining, you agree to our Community Guidelines.
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
