"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Terminal,
  ShieldAlert,
  Users,
  FileClock,
  LogOut,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "member"],
    },
    {
      href: "/dashboard/commands",
      label: "Commands",
      icon: Terminal,
      roles: ["admin", "member"],
    },
    {
      href: "/dashboard/rules",
      label: "Rules",
      icon: ShieldAlert,
      roles: ["admin"],
    },
    {
      href: "/dashboard/users",
      label: "Users & Credits",
      icon: Users,
      roles: ["admin"],
    },
    {
      href: "/dashboard/audit",
      label: "Audit Logs",
      icon: FileClock,
      roles: ["admin"],
    },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <span className="text-lg font-bold text-slate-900">Command Gateway</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          if (user && !link.roles.includes(user.role)) return null;
          
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-slate-50"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      {/* Optional: User info or logout here if not in top bar, but requirements say top bar */}
    </aside>
  );
}

