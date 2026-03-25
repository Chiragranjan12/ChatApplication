import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Video, Info, Copy, Users as UsersIcon, LogOut } from 'lucide-react';
import type { Room } from '@/types';

interface ChatHeaderProps {
  activeRoom: Room;
  handleLeaveGroup: () => void;
}

export function ChatHeader({ activeRoom, handleLeaveGroup }: ChatHeaderProps) {
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopyInvite = () => {
    if (activeRoom?.inviteCode) {
      navigator.clipboard.writeText(activeRoom.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-white/50 dark:bg-black/20 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          {/* Mobile menu trigger would go here */}
        </div>
        <div>
          <h2 className="font-semibold">{activeRoom.name}</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${activeRoom.type === 'PUBLIC' ? 'bg-emerald-500' : 'bg-primary'}`} />
            {activeRoom.type === 'PUBLIC' ? '12 online' : 'Private'}
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
        
        <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Info className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Group Info</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {activeRoom.type === 'PRIVATE_GROUP' && activeRoom.inviteCode && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Invite Code</h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted px-3 py-2 rounded-md font-mono text-sm flex-1 text-center tracking-widest font-bold">
                      {activeRoom.inviteCode}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleCopyInvite}>
                      {copied ? <span className="text-emerald-500 text-xs font-bold">✓</span> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" /> Members ({activeRoom.members?.length || 0})
                </h3>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-1">
                    {activeRoom.members?.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-[10px]">{member.username[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{member.username}</span>
                        {member.id === activeRoom.createdBy && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Owner</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="pt-2 border-t">
                <Button variant="destructive" className="w-full flex items-center justify-center gap-2" onClick={() => { handleLeaveGroup(); setIsInfoOpen(false); }}>
                  <LogOut className="w-4 h-4" /> Leave Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
