'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [recentBoards, setRecentBoards] = useState<{ id: string, name: string, date: string }[]>([]);

  useEffect(() => {
    const savedBoards = localStorage.getItem('collabodraw_boards');
    if (savedBoards) {
      setRecentBoards(JSON.parse(savedBoards));
    }
  }, []);

  const createNewBoard = () => {
    const boardId = Math.random().toString(36).substring(2, 10);
    const newBoard = {
      id: boardId,
      name: `Board ${boardId.substring(0, 4).toUpperCase()}`,
      date: new Date().toLocaleDateString()
    };
    
    const updatedBoards = [newBoard, ...recentBoards];
    setRecentBoards(updatedBoards);
    localStorage.setItem('collabodraw_boards', JSON.stringify(updatedBoards));
    
    router.push(`/board/${boardId}`);
  };

  const deleteBoard = (id: string) => {
    const updatedBoards = recentBoards.filter(b => b.id !== id);
    setRecentBoards(updatedBoards);
    localStorage.setItem('collabodraw_boards', JSON.stringify(updatedBoards));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground relative">
      <main className="flex flex-1 flex-col items-center p-8 mt-12">
        <h2 className="text-4xl font-extrabold tracking-tight mb-4">CollaboDraw Studio</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Start a new whiteboard and share the link to collaborate!
        </p>

        <button
          onClick={createNewBoard}
          className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors mb-16"
        >
          Create New Board
        </button>

        <div className="w-full max-w-2xl">
          <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Your Recent Boards</h3>
          
          {recentBoards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-xl border border-border border-dashed">
              No boards yet. Create one to get started!
            </div>
          ) : (
            <div className="grid gap-3">
              {recentBoards.map((board) => (
                <div key={board.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/board/${board.id}`)}
                  >
                    <h4 className="font-medium text-foreground">{board.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Created on {board.date}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => router.push(`/board/${board.id}`)}
                      className="p-2 text-primary hover:bg-primary/20 rounded-md transition-colors"
                      title="Open Board"
                    >
                      <ArrowRight size={18} />
                    </button>
                    <button 
                      onClick={() => deleteBoard(board.id)}
                      className="p-2 text-destructive hover:bg-destructive/20 rounded-md transition-colors"
                      title="Delete Board"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}