"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Ricardo IA</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Mobile Close Button Overlay */}
        <div className="absolute right-4 top-4 z-50 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
