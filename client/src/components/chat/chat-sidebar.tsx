import React from 'react';
import { Link, useLocation } from 'wouter';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { useWebSocketStore } from '@/stores/websocket-store';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Ghost, LogOut, Plus, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChatSidebar() {
  const [, setLocation] = useLocation();
  const currentUser = useAuthStore(state => state.currentUser);
  const rooms = useChatStore(state => state.rooms);
  const selectRoom = useChatStore(state => state.selectRoom);
  const activeRoomId = useChatStore(state => state.activeRoomId);
  const createRoom = useChatStore(state => state.createRoom);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const createDirectRoom = useChatStore(state => state.createDirectRoom);
  const logout = useAuthStore(state => state.logout);
  const connectionStatus = useWebSocketStore(state => state.connectionStatus);
  const unreadCounts = useChatStore(state => state.unreadCounts);
  const publicRooms = useChatStore(state => state.publicRooms);
  const joinAndSelectPublicRoom = useChatStore(state => state.joinAndSelectPublicRoom);
  
  const [newRoomName, setNewRoomName] = React.useState('');
  const [newRoomDescription, setNewRoomDescription] = React.useState('');
  const [isNewRoomOpen, setIsNewRoomOpen] = React.useState(false);
  const [isNewPublicOpen, setIsNewPublicOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'PUBLIC' | 'PRIVATE_GROUP' | 'DIRECT'>('PUBLIC');
  const [inviteCode, setInviteCode] = React.useState('');
  const [isJoinOpen, setIsJoinOpen] = React.useState(false);
  const [dmLoadingUserId, setDmLoadingUserId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  if (!currentUser) return null;

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      createRoom(newRoomName, 'PRIVATE_GROUP');
      setNewRoomName('');
      setIsNewRoomOpen(false);
    }
  };

  const handleCreatePublicRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      createRoom(newRoomName, 'PUBLIC', newRoomDescription.trim());
      setNewRoomName('');
      setNewRoomDescription('');
      setIsNewPublicOpen(false);
    }
  };

  const handleJoinByInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      useChatStore.getState().joinRoomByInvite(inviteCode);
      setInviteCode('');
      setIsJoinOpen(false);
    }
  };

  const handleStartDM = async (userId: string) => {
    if (dmLoadingUserId) return; // prevent concurrent DM opens
    setDmLoadingUserId(userId);
    try {
      await createDirectRoom(userId);
      setLocation('/chat');
      setActiveTab('DIRECT');
    } catch {
      // createDirectRoom already sets error state
    } finally {
      setDmLoadingUserId(null);
    }
  };

  return (
    <aside className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col glass-card z-10 hidden md:flex">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl">Nexus Chat</h1>
          <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border
            ${connectionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
              connectionStatus === 'connecting' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
              'bg-red-500/10 text-red-600 border-red-500/20'}
          `}>
            <span className={`w-1 h-1 rounded-full animate-pulse
              ${connectionStatus === 'connected' ? 'bg-emerald-500' : 
                connectionStatus === 'connecting' ? 'bg-amber-500' : 
                'bg-red-500'}
            `} />
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-9 bg-sidebar-accent/50 border-none" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-sidebar-border px-4 py-2 bg-sidebar-accent/30 gap-1">
        <Button 
          variant={activeTab === 'PUBLIC' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="flex-1 text-[10px] h-8 uppercase tracking-tight font-bold relative"
          onClick={() => setActiveTab('PUBLIC')}
        >
          Public
          {rooms.filter(r => r.type === 'PUBLIC' && (unreadCounts[r.id] || 0) > 0).length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </Button>
        <Button 
          variant={activeTab === 'PRIVATE_GROUP' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="flex-1 text-[10px] h-8 uppercase tracking-tight font-bold relative"
          onClick={() => setActiveTab('PRIVATE_GROUP')}
        >
          Groups
          {rooms.filter(r => r.type === 'PRIVATE_GROUP' && (unreadCounts[r.id] || 0) > 0).length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </Button>
        <Button 
          variant={activeTab === 'DIRECT' ? 'secondary' : 'ghost'} 
          size="sm" 
          className="flex-1 text-[10px] h-8 uppercase tracking-tight font-bold relative"
          onClick={() => setActiveTab('DIRECT')}
        >
          DMs
          {rooms.filter(r => r.type === 'DIRECT' && (unreadCounts[r.id] || 0) > 0).length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {activeTab === 'PUBLIC' && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center justify-between px-2 mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public Channels</h2>
                <div className="flex gap-1">
                  <Dialog open={isNewPublicOpen} onOpenChange={setIsNewPublicOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-sidebar-accent" title="Create Public Channel">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Public Channel</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreatePublicRoom} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Channel Name</Label>
                          <Input 
                            placeholder="e.g. General Chat" 
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (optional)</Label>
                          <Input 
                            placeholder="What is this channel about?" 
                            value={newRoomDescription}
                            onChange={e => setNewRoomDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Visibility</Label>
                          <Input value="Public (Visible to everyone)" disabled className="bg-muted cursor-not-allowed" />
                        </div>
                        <Button type="submit" className="w-full">Create Channel</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-1">
                {publicRooms
                  .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(room => (
                  <button
                    key={room.id}
                    onClick={() => { joinAndSelectPublicRoom(room.id); setLocation('/chat'); }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex flex-col gap-1
                      ${activeRoomId === room.id ? 'bg-primary/10 shadow-sm' : 'hover:bg-sidebar-accent'}
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Users className={`w-4 h-4 ${activeRoomId === room.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`flex-1 text-sm font-semibold truncate ${activeRoomId === room.id ? 'text-primary' : 'text-sidebar-foreground'}`}>
                        # {room.name}
                      </span>
                      {(unreadCounts[room.id] || 0) > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                        </span>
                      )}
                    </div>
                    
                    {room.description && (
                      <span className="text-xs text-muted-foreground truncate w-full block pl-6">
                        {room.description}
                      </span>
                    )}
                    
                    <div className="flex items-center gap-2 pl-6 mt-1 opacity-70">
                      <span className="text-[10px] text-muted-foreground font-medium bg-background/50 px-1.5 py-0.5 rounded">
                        {room.memberCount || room.members?.length || 0} members
                      </span>
                    </div>
                  </button>
                ))}
                {publicRooms.length === 0 && (
                  <div className="px-2 py-6 text-center">
                    <p className="text-xs text-muted-foreground italic mb-3">No public channels found</p>
                    <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => {
                      setNewRoomName('');
                      setNewRoomDescription('');
                      setIsNewPublicOpen(true);
                    }}>
                      Create the first public channel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'PRIVATE_GROUP' && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center justify-between px-2 mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Private Groups</h2>
                <div className="flex gap-1">
                  <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-sidebar-accent" title="Join by Invite">
                        <Search className="w-3.5 h-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Join Private Group</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleJoinByInvite} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Invite Code</Label>
                          <Input 
                            placeholder="Enter 8-character code" 
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                          />
                        </div>
                        <Button type="submit" className="w-full">Join Group</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isNewRoomOpen} onOpenChange={setIsNewRoomOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-sidebar-accent" title="Create Group">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Private Group</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateRoom} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Group Name</Label>
                          <Input 
                            placeholder="e.g. Project Alpha" 
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                          />
                        </div>
                        <Button type="submit" className="w-full">Create Group</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-1">
                {rooms
                  .filter(r => r.type === 'PRIVATE_GROUP')
                  .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(room => (
                  <button
                    key={room.id}
                    onClick={() => { selectRoom(room.id); setLocation('/chat'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3
                      ${activeRoomId === room.id ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-sidebar-accent text-sidebar-foreground'}
                    `}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div className="flex-1 truncate">
                      {room.name}
                      {room.inviteCode && (
                        <span className="ml-2 text-[8px] opacity-50 font-mono bg-sidebar-accent px-1 rounded">#{room.inviteCode}</span>
                      )}
                    </div>
                    {((unreadCounts[room.id] || 0) > 0) && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                      </span>
                    )}
                  </button>
                ))}
                {rooms.filter(r => r.type === 'PRIVATE_GROUP').length === 0 && (
                  <p className="text-[10px] text-muted-foreground px-2 py-4 text-center italic">No private groups joined</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'DIRECT' && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider">Direct Messages</h2>
              <div className="space-y-1">
                {rooms
                  .filter(r => r.type === 'DIRECT')
                  .filter(r => r.members?.find(p => p.username !== currentUser.username)?.username.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(room => {
                  const otherMember = room.members?.find(p => p.username !== currentUser.username);
                  const unread = unreadCounts[room.id] || 0;
                  return (
                    <button
                      key={room.id}
                      onClick={() => { selectRoom(room.id); setLocation('/chat'); }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3
                        ${activeRoomId === room.id ? 'bg-primary/10 text-primary shadow-sm' : 'hover:bg-sidebar-accent text-sidebar-foreground'}
                      `}
                    >
                      <Avatar className="h-5 w-5 border border-primary/10">
                        <AvatarImage src={otherMember?.avatarUrl} />
                        <AvatarFallback className="text-[8px] bg-primary/5">{otherMember?.username?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className={`truncate flex-1 ${unread > 0 ? 'font-semibold' : ''}`}>
                        {otherMember?.username || 'Direct Chat'}
                      </span>
                      {unread > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {rooms.filter(r => r.type === 'DIRECT').length === 0 && (
                  <p className="text-[10px] text-muted-foreground px-2 py-4 text-center italic">No direct messages yet</p>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-[10px] font-bold text-muted-foreground mb-3 px-2 uppercase tracking-widest opacity-60">Online Users</h3>
                <div className="space-y-1">
                  {onlineUsers.filter(u => u.id !== currentUser.id).map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleStartDM(user.id)}
                      disabled={dmLoadingUserId === user.id}
                      className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-3 hover:bg-sidebar-accent text-sidebar-foreground group disabled:opacity-60 disabled:cursor-wait"
                    >
                      <div className="relative">
                        <Avatar className="h-5 w-5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="text-[8px]">{user.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-sidebar rounded-full shadow-sm" />
                      </div>
                      <span className="truncate flex-1">{user.username}</span>
                      {dmLoadingUserId === user.id ? (
                        <span className="text-[10px] opacity-50 animate-pulse">Opening...</span>
                      ) : (
                        <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Message
                        </span>
                      )}
                    </button>
                  ))}
                  {onlineUsers.filter(u => u.id !== currentUser.id).length === 0 && (
                    <p className="text-[10px] text-muted-foreground px-2 py-4 text-center italic">No other users online</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground mb-3 px-2 uppercase tracking-wider border-t border-sidebar-border/30 pt-4">Discovery</h2>
            <Link href="/random">
              <Button variant="secondary" className="w-full justify-start gap-3 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 border border-violet-200/50 dark:border-violet-900/50 text-foreground transition-all duration-300 shadow-sm mb-4">
                <Ghost className="w-4 h-4 text-violet-500 animate-bounce-slow" />
                Random Chat
              </Button>
            </Link>
            
            <h3 className="text-[10px] font-bold text-muted-foreground mb-3 px-2 uppercase tracking-widest opacity-60">Trending Public Rooms</h3>
            <div className="space-y-1">
              {publicRooms
                .slice()
                .sort((a, b) => (b.memberCount || b.members?.length || 0) - (a.memberCount || a.members?.length || 0))
                .slice(0, 3)
                .map(room => (
                  <button
                    key={`trending-${room.id}`}
                    onClick={() => { joinAndSelectPublicRoom(room.id); setLocation('/chat'); setActiveTab('PUBLIC'); }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between hover:bg-sidebar-accent text-sidebar-foreground"
                  >
                    <span className="truncate flex-1"># {room.name}</span>
                    <span className="text-[10px] opacity-70 bg-sidebar-accent/50 px-1.5 py-0.5 rounded">
                      {room.memberCount || room.members?.length || 0}
                    </span>
                  </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback>{currentUser.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.username}</p>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {connectionStatus === 'connected' && "🟢 Connected"}
              {connectionStatus === 'connecting' && "🟡 Connecting..."}
              {connectionStatus === 'disconnected' && "🔴 Offline"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
