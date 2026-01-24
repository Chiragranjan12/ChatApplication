import React from 'react';
import { useLocation } from 'wouter';
import { useChatStore } from '@/lib/mock-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Chrome } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [username, setUsername] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [, setLocation] = useLocation();
  const login = useChatStore(state => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    login(username);
    setIsLoading(false);
    setLocation('/chat');
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
        <Card className="glass-card border-none shadow-2xl">
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
            <Button variant="outline" className="w-full h-11 relative" disabled={isLoading}>
              <Chrome className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with username</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="e.g. creative_mind" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-white/50 dark:bg-black/20"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Enter Chat'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-sm text-muted-foreground">
            By joining, you agree to our Community Guidelines.
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
