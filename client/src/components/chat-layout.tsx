import React from 'react';
import { Link, useLocation } from 'wouter';
import { useChatStore } from '@/lib/mock-chat';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Ghost, Settings, LogOut, Plus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { currentUser, rooms, selectRoom, activeRoomId, createPrivateRoom, logout } = useChatStore();
  const [newRoomName, setNewRoomName] = React.useState('');
  const [isNewRoomOpen, setIsNewRoomOpen] = React.useState(false);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!currentUser) {
      setLocation('/auth');
    }
  }, [currentUser, setLocation]);

  if (!currentUser) return null;

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      createPrivateRoom(newRoomName);
      setNewRoomName('');
      setIsNewRoomOpen(false);
    }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col glass-card z-10 hidden md:flex">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display font-bold text-xl">Nexus Chat</h1>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="pl-9 bg-sidebar-accent/50 border-none" />
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Public Channels</h2>
              <div className="space-y-1">
                {rooms.filter(r => r.type === 'public').map(room => (
                  <button
                    key={room.id}
                    onClick={() => { selectRoom(room.id); setLocation('/chat'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3
                      ${activeRoomId === room.id ? 'bg-primary/10 text-primary' : 'hover:bg-sidebar-accent text-sidebar-foreground'}
                    `}
                  >
                    <Users className="w-4 h-4 opacity-70" />
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-2 mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private Rooms</h2>
                <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-transparent">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Private Room</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateRoom} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Room Name</Label>
                        <Input 
                          placeholder="e.g. Project Alpha" 
                          value={newRoomName}
                          onChange={e => setNewRoomName(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full">Create Room</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-1">
                {rooms.filter(r => r.type === 'private').map(room => (
                  <button
                    key={room.id}
                    onClick={() => { selectRoom(room.id); setLocation('/chat'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3
                      ${activeRoomId === room.id ? 'bg-primary/10 text-primary' : 'hover:bg-sidebar-accent text-sidebar-foreground'}
                    `}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Discovery</h2>
              <Link href="/random">
                <Button variant="secondary" className="w-full justify-start gap-3 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 border-violet-200/50 dark:border-violet-900/50 text-foreground">
                  <Ghost className="w-4 h-4 text-violet-500" />
                  Random Chat
                </Button>
              </Link>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>{currentUser.username[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.username}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()}>
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
