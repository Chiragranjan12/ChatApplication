import React from 'react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLocation } from 'wouter';
import { websocketService } from '@/lib/websocket';
import ChatLayout from '@/components/chat-layout';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatInput } from '@/components/chat/chat-input';

export default function Chat() {
  const [, setLocation] = useLocation();
  const currentUser = useAuthStore(state => state.currentUser);
  const rooms = useChatStore(state => state.rooms);
  const activeRoomId = useChatStore(state => state.activeRoomId);
  const messages = useChatStore(state => state.messages);
  const sendMessage = useChatStore(state => state.sendMessage);
  const typingUsers = useChatStore(state => state.typingUsers);
  const leaveRoom = useChatStore(state => state.leaveRoom);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const roomMessages = activeRoomId ? messages[activeRoomId] || [] : [];
  const otherTyping = activeRoomId 
    ? (typingUsers[activeRoomId] || []).filter(u => u !== currentUser?.username)
    : [];

  const [inputValue, setInputValue] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll logic
  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const scrollViewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [roomMessages.length, scrollToBottom]);

  if (!currentUser) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeRoomId) return;

    try {
      await sendMessage(inputValue.trim());
      setInputValue('');
      scrollToBottom();
    } catch {
      // toast is already handled in store
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (activeRoomId) {
      websocketService.sendTypingEvent(activeRoomId, true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        websocketService.sendTypingEvent(activeRoomId, false);
      }, 2000);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeRoom) return;
    try {
      await leaveRoom(activeRoom.id);
      setLocation('/chat'); // redirect to chat home
    } catch {
      // error handled by store
    }
  };

  if (!activeRoomId || !activeRoom) {
    return (
      <ChatLayout>
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-bold mb-2 font-display text-foreground">Welcome to Nexus Chat</h2>
            <p className="text-sm">Select a chat from the sidebar or start a new conversation to connect with your team.</p>
          </div>
        </div>
      </ChatLayout>
    );
  }

  // Ensure active room still exists
  const isRoomValid = rooms.some(r => r.id === activeRoom.id);
  if (!isRoomValid) {
    setLocation('/chat');
    return null;
  }

  return (
    <ChatLayout>
      <ChatHeader activeRoom={activeRoom} handleLeaveGroup={handleLeaveGroup} />
      
      <ChatMessageList 
        roomMessages={roomMessages}
        currentUser={currentUser}
        otherTyping={otherTyping}
        scrollRef={scrollRef}
      />
      
      <ChatInput 
        inputValue={inputValue}
        handleInputChange={handleInputChange}
        handleSend={handleSend}
      />
    </ChatLayout>
  );
}
