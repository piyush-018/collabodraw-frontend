'use client'
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation"; 
import { Navbar } from "@/components/whiteboard/navbar";
import { Toolbar } from "@/components/whiteboard/toolbar";
import { Canvas } from "@/components/whiteboard/canvas";
import type { Tool } from "@/lib/whiteboard-types";
import { socket } from "@/lib/socket"; 
import { MessageCircle, X, Send } from "lucide-react"; 

export default function BoardPage() {
  const [tool, setTool] = useState<Tool>('select');
  const params = useParams(); 
  const roomId = params?.boardID as string;

  const [isChatOpen, setIsChatOpen] = useState(false);
  // 🔴 NAYA: Message type mein senderName add kar diya
  const [messages, setMessages] = useState<{id: string, text: string, sender: 'me'|'other', senderName?: string}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  useEffect(() => {
    const handleIncoming = (data: any) => {
      if (data.chatMessage) {
        setMessages(prev => [...prev, { 
          id: Math.random().toString(), 
          text: data.chatMessage, 
          sender: 'other',
          senderName: data.senderName || 'U' 
        }]);
      }
    };
    socket.on('cursor-move', handleIncoming);
    return () => socket.off('cursor-move', handleIncoming);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'v': setTool('select'); break;
        case 'p': setTool('draw'); break;
        case 'w': setTool('laser'); break;
        case 's': setTool('sticky'); break;
        case 'l': setTool('line'); break;
        case 'r': setTool('rectangle'); break;
        case 'c': setTool('circle'); break;
        case 't': setTool('text'); break;
        case 'e': setTool('eraser'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { id: Math.random().toString(), text: inputValue.trim(), sender: 'me' }]);
    
    socket.emit('cursor-move', { 
      boardId: roomId, 
      x: -1000, 
      y: -1000, 
      color: 'transparent', 
      chatMessage: inputValue.trim(),
      senderName: 'U' // Samne wale ko yeh icon dikhega
    });
    
    setInputValue(""); 
  };

  if (!roomId) {
    return <div className="flex h-dvh items-center justify-center bg-background text-foreground">Loading Board...</div>;
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden relative">
      <Navbar />
      <div className="relative flex flex-1">
        <Toolbar activeTool={tool} onToolChange={setTool} />
        <Canvas tool={tool} boardId={roomId} />
      </div>

      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="mb-4 flex h-[400px] w-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <h3 className="font-semibold text-foreground text-sm">Live Team Chat</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground text-center px-4">
                  No messages yet. Say hi to your team! 👋
                </div>
              ) : (
                messages.map((msg) => (
                  // 🔴 NAYA: Avatar (DP) + Chat Bubble Layout
                  <div key={msg.id} className={`flex gap-2 items-end ${msg.sender === 'me' ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                    
                    {/* DP Icon */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm ${
                      msg.sender === 'me' ? 'bg-primary' : 'bg-emerald-500'
                    }`}>
                      {msg.sender === 'me' ? 'ME' : msg.senderName}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${
                      msg.sender === 'me' 
                        ? 'bg-primary text-primary-foreground rounded-br-none' 
                        : 'bg-muted text-foreground border border-border rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95"
                >
                  <Send size={16} className="ml-1" />
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-primary/25 active:scale-95"
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </main>
  );
}