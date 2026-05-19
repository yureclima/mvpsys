import Link from "next/link";
import { LayoutDashboard, Users, MessageSquare, Bot, Contact } from "lucide-react";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/" },
    { name: "CRM Kanban", icon: Users, href: "/crm" },
    { name: "Contatos", icon: Contact, href: "/contatos" },
    { name: "Agente IA", icon: Bot, href: "/agent" },
    { name: "WhatsApp", icon: MessageSquare, href: "/whatsapp" },
  ];

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-50 flex flex-col h-full border-r border-zinc-800">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight">Ricardo IA</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className="flex items-center space-x-3 px-3 py-2 rounded-md transition-colors hover:bg-zinc-800 text-zinc-300 hover:text-white"
            >
              <Icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">R</span>
          </div>
          <div>
            <p className="text-sm font-medium">Ricardo IA</p>
            <p className="text-xs text-zinc-500">ricardo@user.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
