import React from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, UserX, SkipForward, Loader2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function RandomChatPage() {
  const messages = useChatStore(state => state.messages);
  const activeRoomId = useChatStore(state => state.activeRoomId);
  const rooms = useChatStore(state => state.rooms);
  const currentUser = useAuthStore(state => state.currentUser);
  const sendMessage = useChatStore(state => state.sendMessage);
  const joinRandomChat = useChatStore(state => state.joinRandomChat);
  const leaveRandomChat = useChatStore(state => state.leaveRandomChat);
  const randomState = useChatStore(state => state.randomState);
  const typingUsers = useChatStore(state => state.typingUsers);

  const [inputValue, setInputValue] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  // Guard against concurrent handleNext calls (race condition fix)
  const isTransitioning = React.useRef(false);

  const activeRoom = rooms.find(r => r.id === activeRoomId && r.type === 'RANDOM');
  const roomMessages = activeRoomId && activeRoom ? messages[activeRoomId] || [] : [];
  const activeRoomTyping = activeRoomId ? typingUsers[activeRoomId] || [] : [];
  // For random chat, we don't care about the username, just if ANYONE else is typing
  const isOtherTyping = activeRoomTyping.some(u => u !== currentUser?.username);

  // Smart auto scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      // Auto-scroll if near bottom or if first load (few messages)
      if (isNearBottom || roomMessages.length <= 15) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [roomMessages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (activeRoomId) {
      import('@/lib/websocket').then(({ websocketService }) => {
        websocketService.sendTypingEvent(activeRoomId, true);
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          websocketService.sendTypingEvent(activeRoomId, false);
        }, 2000);
      });
    }
  };

  const handleFindMatch = async () => {
    try {
      await joinRandomChat();
    } catch (error) {
      console.error('Matching failed:', error);
    }
  };

  const handleNext = async () => {
    if (isTransitioning.current) return; // Prevent concurrent calls
    isTransitioning.current = true;
    try {
      if (activeRoomId) {
        await leaveRandomChat();
      }
      setInputValue('');
      await handleFindMatch();
    } finally {
      isTransitioning.current = false;
    }
  };

  const handleStop = async () => {
    if (activeRoomId || randomState === 'searching' || randomState === 'disconnected') {
      await leaveRandomChat();
    }
    setInputValue('');
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && activeRoomId) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  // Idle state - not searching, not connected
  if (randomState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
        <div className="max-w-md w-full space-y-8">
          <div className="w-20 h-20 bg-background rounded-full mx-auto flex items-center justify-center shadow-xl ring-4 ring-background">
            <UserX className="w-8 h-8 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-display font-bold">
              Talk to Strangers
            </h2>
            <p className="text-muted-foreground">
              Connect anonymously. No history saved. Skip anytime.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Users className="w-4 h-4" />
              <span>Stay safe. Be respectful.</span>
            </div>
          </div>

          <div className="pt-4">
            <Button
              size="lg"
              onClick={handleFindMatch}
              className="rounded-full px-12 h-14 text-lg shadow-xl shadow-primary/20"
            >
              <SkipForward className="w-5 h-5 mr-2" />
              Find Stranger
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Searching state
  if (randomState === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
        <div className="max-w-md w-full space-y-8">
          <div className="w-20 h-20 bg-background rounded-full mx-auto flex items-center justify-center shadow-xl ring-4 ring-background">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-display font-bold">
              Finding a stranger...
            </h2>
            <p className="text-muted-foreground">
              Connecting you with someone random from around the world.
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleStop}
              className="rounded-full px-8"
            >
              Cancel Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - show chat interface
  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-white/50 dark:bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-semibold">Anonymous Chat</h2>
            {randomState === 'disconnected' ? (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                Stranger disconnected
              </p>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Stranger connected
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {randomState === 'disconnected' ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleFindMatch}
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Find New
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Next
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            End Chat
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-6 py-6" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {roomMessages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p>Say hello to start chatting! 👋</p>
                <p className="text-xs mt-2">Remember: Be respectful and stay safe</p>
              </div>
            )}

            {roomMessages.map((msg, index) => {
              const isMe = msg.senderId === currentUser?.id;
              const isSystem = msg.type === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-4">
                    <span className="text-xs bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isMe ? 'You' : 'Stranger'}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm relative group
                        ${isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-white dark:bg-zinc-800 border border-border rounded-tl-none'
                        }
                      `}
                    >
                      <div className="mb-0.5">{msg.text}</div>
                      <div className={`text-[10px] text-right opacity-70 ${isMe ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {format(new Date(msg.createdAt), 'h:mm')}
                      </div>
                      {isMe && msg.status === 'sending' && (
                        <span className="absolute right-[-20px] bottom-1 text-[10px]">⏳</span>
                      )}
                      {isMe && msg.status === 'failed' && (
                        <span className="absolute right-[-20px] bottom-1 text-[10px]">❌</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        {isOtherTyping && (
          <div className="absolute bottom-2 left-6 text-xs text-muted-foreground italic animate-pulse">
            Typing...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border">
        {randomState === 'disconnected' ? (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center p-4">
              <p className="text-muted-foreground mb-4">Stranger left the chat.</p>
              <Button onClick={handleFindMatch} className="rounded-full px-8">
                <SkipForward className="w-4 h-4 mr-2" />
                Find New Stranger
              </Button>
            </div>
        ) : (
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-2">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type anonymously..."
              className="flex-1 h-12 rounded-full pl-6 pr-12 bg-white/80 dark:bg-zinc-900/80 border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md"
              disabled={!inputValue.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
