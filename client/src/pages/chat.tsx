import React from 'react';
import { useChatStore, Message } from '@/lib/mock-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MoreVertical, Phone, Video, Info, Flag, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { SafetyGuard, ReportButton } from '@/components/safety-guard';

export default function ChatPage() {
  const { messages, activeRoomId, rooms, currentUser, sendMessage } = useChatStore();
  const [inputValue, setInputValue] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const roomMessages = activeRoomId ? messages[activeRoomId] || [] : [];

  // Auto scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [roomMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a room to start chatting
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl">
      <SafetyGuard />
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-white/50 dark:bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            {/* Mobile menu trigger would go here */}
          </div>
          <div>
            <h2 className="font-semibold">{activeRoom.name}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${activeRoom.type === 'public' ? 'bg-emerald-500' : 'bg-primary'}`} />
              {activeRoom.type === 'public' ? '12 online' : 'Private'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-6 py-6" ref={scrollRef}>
          <div className="space-y-6 pb-4">
             {roomMessages.length === 0 && (
               <div className="text-center text-muted-foreground py-12">
                 <p>No messages yet. Be the first to say hello! 👋</p>
               </div>
             )}
             
            {roomMessages.map((msg, index) => {
              const isMe = msg.senderId === currentUser?.id;
              const isSystem = msg.type === 'system';
              const showAvatar = !isMe && !isSystem && (index === 0 || roomMessages[index - 1].senderId !== msg.senderId);

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
                  {!isMe && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAvatar && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground ml-1">User {msg.senderId.slice(0,4)}</span>
                        {!isMe && <ReportButton />}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm relative group
                        ${isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-white dark:bg-zinc-800 border border-border rounded-tl-none'
                        }
                      `}
                    >
                      {msg.text}
                      <span className={`text-[10px] opacity-0 group-hover:opacity-70 transition-opacity absolute bottom-1 ${isMe ? 'left-[-40px] text-muted-foreground' : 'right-[-40px] text-muted-foreground'}`}>
                        {format(msg.timestamp, 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-2">
           <Input 
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             placeholder="Type a message..."
             className="flex-1 h-12 rounded-full pl-6 pr-12 bg-white/80 dark:bg-zinc-900/80 border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
           />
           <Button type="submit" size="icon" className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md" disabled={!inputValue.trim()}>
             <Send className="w-4 h-4" />
           </Button>
        </form>
      </div>
    </div>
  );
}
