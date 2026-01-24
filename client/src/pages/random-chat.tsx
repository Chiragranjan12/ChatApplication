import React from 'react';
import { useChatStore } from '@/lib/mock-chat';
import { Button } from '@/components/ui/button';
import { Loader2, UserX, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

export default function RandomChatPage() {
  const { joinRandomChat, leaveRandomChat, activeRoomId, rooms } = useChatStore();
  const [status, setStatus] = React.useState<'idle' | 'searching' | 'connected'>('idle');
  const [, setLocation] = useLocation();

  const handleFindMatch = async () => {
    setStatus('searching');
    await joinRandomChat();
    setStatus('connected');
    setLocation('/chat');
  };

  React.useEffect(() => {
    return () => {
      // Cleanup if component unmounts
      if (status === 'searching') setStatus('idle');
    };
  }, [status]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
      <div className="max-w-md w-full space-y-8">
        <div className="w-20 h-20 bg-background rounded-full mx-auto flex items-center justify-center shadow-xl ring-4 ring-background">
          {status === 'searching' ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <UserX className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-display font-bold">
            {status === 'searching' ? 'Finding a stranger...' : 'Talk to Strangers'}
          </h2>
          <p className="text-muted-foreground">
            {status === 'searching' 
              ? 'Connecting you with someone random from around the world.' 
              : 'Connect anonymously. No history saved. Skip anytime.'}
          </p>
        </div>

        <div className="pt-4">
          {status === 'searching' ? (
            <Button variant="outline" size="lg" onClick={() => setStatus('idle')} className="rounded-full px-8">
              Cancel Search
            </Button>
          ) : (
            <Button size="lg" onClick={handleFindMatch} className="rounded-full px-12 h-14 text-lg shadow-xl shadow-primary/20">
              <RefreshCw className="w-5 h-5 mr-2" />
              Find Partner
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
