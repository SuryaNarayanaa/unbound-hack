"use client";

import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Command } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { format } from "date-fns";
import { Activity, Ban, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user, apiKey } = useAuth();
  
  const commands = useQuery(
    api.queries.listCommands,
    apiKey ? { apiKey } : "skip"
  ) || [];

  const stats = useMemo(() => {
    const total = commands.length;
    const executed = commands.filter((c: any) => c.status === "executed").length;
    const rejected = commands.filter((c: any) => c.status === "rejected").length;
    const pending = commands.filter((c: any) => c.status === "needs_approval" || c.status === "pending").length;
    return { total, executed, rejected, pending };
  }, [commands]);

  const recentCommands = useMemo(() => commands.slice(0, 5), [commands]);
  const loading = commands === undefined;

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 text-slate-50">
        <CardHeader>
          <CardTitle>Welcome back, {user?.name}</CardTitle>
          <CardDescription className="text-slate-300">
            You have <span className="font-bold text-white">{user?.credits} credits</span> available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">
            This is your Command Gateway dashboard. Submit commands, track their status, and manage your rules here.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commands</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executed}</div>
            <p className="text-xs text-slate-500">
              {stats.total > 0 ? Math.round((stats.executed / stats.total) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Commands</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCommands.length === 0 ? (
            <p className="text-sm text-slate-500">No commands submitted yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Command</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCommands.map((cmd: any) => (
                  <TableRow key={cmd._id}>
                    <TableCell className="font-mono text-xs">
                      {cmd.command_text ? (cmd.command_text.substring(0, 50) + (cmd.command_text.length > 50 ? '...' : '')) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        cmd.status === "executed" ? "success" :
                        cmd.status === "rejected" ? "destructive" :
                        cmd.status === "needs_approval" ? "warning" : "secondary"
                      }>
                        {cmd.status || 'unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{cmd.cost ?? 0}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {cmd.created_at ? format(new Date(cmd.created_at), "MMM d, HH:mm") : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

