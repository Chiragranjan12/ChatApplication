import React from 'react';
import { Shield, Check, AlertTriangle, UserX, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useChatStore } from '@/lib/mock-chat';

export function SafetyGuard() {
  const [open, setOpen] = React.useState(true);
  const currentUser = useChatStore(state => state.currentUser);

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md glass border-none shadow-2xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-display font-bold">Community Guidelines</DialogTitle>
          <DialogDescription className="text-center pt-2">
            To keep Nexus Chat safe and friendly, please follow our rules:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Be Respectful:</span> Treat others with kindness and respect.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserX className="w-3 h-3 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">No Harassment:</span> Bullying or hate speech is not tolerated.</p>
          </div>
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Keep it Legal:</span> Do not share illegal content or personal information.</p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button type="button" className="w-full rounded-full" onClick={() => setOpen(false)}>
            I Agree & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportButton() {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
      <Flag className="w-4 h-4" />
    </Button>
  );
}
