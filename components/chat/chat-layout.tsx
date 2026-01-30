'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, LogOut, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:overflow-hidden"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">AI Builder</h1>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Button className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" />
            New Project
          </Button>

          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Projects</h2>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal">
              <MessageSquare className="h-4 w-4" />
              E-commerce Store
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal">
              <MessageSquare className="h-4 w-4" />
              Portfolio Site
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal">
              <MessageSquare className="h-4 w-4" />
              Landing Page
            </Button>
          </div>
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <form action="/api/auth/logout" method="POST">
             <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" type="submit">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <header className="lg:hidden h-14 border-b border-border flex items-center px-4 justify-between bg-card">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Chat</span>
          <div className="w-9" />
        </header>
        
        <div className="flex-1 overflow-hidden relative">
            {children}
        </div>
      </main>
    </div>
  );
}
