import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSend: (e: React.FormEvent) => void;
}

export function ChatInput({ inputValue, handleInputChange, handleSend }: ChatInputProps) {
  return (
    <div className="p-4 bg-background/50 backdrop-blur-md border-t border-border">
      <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-2">
        <Input 
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 h-12 rounded-full pl-6 pr-12 bg-white/80 dark:bg-zinc-900/80 border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button type="submit" size="icon" className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-md" disabled={!inputValue.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
