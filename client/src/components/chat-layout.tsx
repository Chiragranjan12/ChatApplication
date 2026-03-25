import React from 'react';
import { useLocation } from 'wouter';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { ChatSidebar } from '@/components/chat/chat-sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const currentUser = useAuthStore(state => state.currentUser);
  const fetchOnlineUsers = useChatStore(state => state.fetchOnlineUsers);
  const fetchPublicRooms = useChatStore(state => state.fetchPublicRooms);
  const initPresence = useChatStore(state => state.initPresence);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!currentUser) {
      setLocation('/auth');
    } else {
      fetchOnlineUsers();
      fetchPublicRooms();
      initPresence();
    }
  }, [currentUser, setLocation, fetchOnlineUsers, fetchPublicRooms, initPresence]);

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar />
      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
