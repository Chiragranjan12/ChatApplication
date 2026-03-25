import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ReportButton } from '@/components/safety-guard';
import type { Message, User } from '@/types';

interface ChatMessageListProps {
  roomMessages: Message[];
  currentUser: User | null;
  otherTyping: string[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatMessageList({ roomMessages, currentUser, otherTyping, scrollRef }: ChatMessageListProps) {
  return (
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
            const isSystem = msg.type === 'SYSTEM';
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
                        <AvatarImage src={msg.senderAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground ml-1">{msg.senderUsername}</span>
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

      {otherTyping.length > 0 && (
        <div className="absolute bottom-2 left-6 text-xs text-muted-foreground italic animate-pulse">
          {otherTyping.length === 1 ? `${otherTyping[0]} is typing...` : `${otherTyping.join(', ')} are typing...`}
        </div>
      )}
    </div>
  );
}
