import React from 'react';
import { useLocation } from 'wouter';
import { useChatStore } from '@/lib/mock-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Chrome, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [step, setStep] = React.useState<'login' | 'accounts' | 'otp'>('login');
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setLocation] = useLocation();
  const login = useChatStore(state => state.login);

  const MOCK_ACCOUNTS = [
    { name: 'Use my Google Account', email: 'Your device account will be used', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' }
  ];

  const handleGoogleLoginClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setStep('accounts');
      setIsLoading(false);
    }, 600);
  };

  const handleSelectAccount = (acc: typeof MOCK_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    login(email.split('@')[0]);
    setIsLoading(false);
    setLocation('/chat');
  };

  const handleManualGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setEmail(username.includes('@') ? username : `${username}@gmail.com`);
    setStep('otp');
    setIsLoading(false);
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
          <AnimatePresence mode="wait">
            {step === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <CardHeader className="text-center space-y-4 pb-8">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-display font-bold">Welcome back</CardTitle>
                    <CardDescription>Enter your details to access the chat</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full h-11 relative" 
                    disabled={isLoading}
                    onClick={handleGoogleLoginClick}
                    data-testid="button-google-login"
                  >
                    <Chrome className="w-4 h-4 mr-2" />
                    Continue with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or connect with google account</span>
                    </div>
                  </div>

                  <form onSubmit={handleManualGoogleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Google Email or Username</Label>
                      <Input 
                        id="username" 
                        placeholder="name@gmail.com" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-11 bg-white/50 dark:bg-black/20"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? 'Connecting...' : 'Continue'}
                    </Button>
                  </form>
                </CardContent>
              </motion.div>
            )}

            {step === 'accounts' && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="text-center mb-8">
                  <Chrome className="w-10 h-10 mx-auto mb-4 text-[#4285F4]" />
                  <h3 className="text-xl font-bold">Choose an account</h3>
                  <p className="text-sm text-muted-foreground">to continue to Nexus Chat</p>
                </div>
                <div className="space-y-2">
                  {MOCK_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-transparent hover:border-border"
                    >
                      <img src={acc.avatar} className="w-10 h-10 rounded-full" alt={acc.name} />
                      <div>
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => setStep('login')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left text-sm text-primary font-medium"
                  >
                    Use another account
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6"
              >
                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Verify your identity</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We've sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <Label>One-Time Password</Label>
                    <Input 
                      placeholder="0 0 0 0 0 0" 
                      className="text-center text-2xl tracking-[0.5em] h-14 font-mono"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 text-base" disabled={isLoading || otp.length < 6}>
                    {isLoading ? 'Verifying...' : 'Verify & Enter'}
                  </Button>
                  <button 
                    type="button"
                    onClick={() => setStep('login')}
                    className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          <CardFooter className="justify-center text-sm text-muted-foreground pb-6">
            By joining, you agree to our Community Guidelines.
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
