
// src/components/chat-view.tsx
'use client';

import { useEffect, useRef } from 'react';
import ChatMessage, { type Message } from './chat-message';
import ChatInput from './chat-input';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ChatViewProps {
  messages: Message[];
  isResponding: boolean;
  onSendMessage: (input: string) => void;
}

export default function ChatView({ messages, isResponding, onSendMessage }: ChatViewProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isResponding]);

  return (
    <div className="flex-1 flex flex-col justify-between">
        <ScrollArea className="flex-1">
            <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
                {isResponding && (
                    <div className="flex items-center gap-4 py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">O Chef está pensando...</p>
                    </div>
                )}
                 <div ref={endOfMessagesRef} />
            </div>
        </ScrollArea>
        <ChatInput onSendMessage={onSendMessage} isResponding={isResponding} />
    </div>
  );
}
