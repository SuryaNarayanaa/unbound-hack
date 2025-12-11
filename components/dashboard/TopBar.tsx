"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LogOut, Coins } from "lucide-react";

export function TopBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-slate-900">
          Welcome, {user.name}
        </h2>
        <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
          {user.role.toUpperCase()}
        </Badge>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">{user.credits} Credits</span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Change Key
        </Button>
      </div>
    </header>
  );
}

