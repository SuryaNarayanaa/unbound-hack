"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { AuditLog, User } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { Filter, RefreshCw, Eye } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function AuditPage() {
  const { user, apiKey } = useAuth();
  const { addToast } = useToast();

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterEvent, setFilterEvent] = useState<"" | "COMMAND_SUBMITTED" | "COMMAND_EXECUTED" | "COMMAND_REJECTED" | "RULE_CREATED" | "USER_CREATED" | "CREDITS_UPDATED" | "RULE_UPDATED" | "RULE_DELETED">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const users = useQuery(
    api.queries.listUsers,
    apiKey ? { apiKey } : "skip"
  ) || [];

  const logs = useQuery(
    api.queries.getAuditLogs,
    apiKey ? {
      apiKey,
      userId: filterUser ? (filterUser as Id<"users">) : undefined,
      eventType: filterEvent || undefined,
      from: dateFrom ? new Date(dateFrom).getTime() : undefined,
      to: dateTo ? new Date(dateTo).getTime() : undefined,
    } : "skip"
  ) || [];
  
  const isLoading = logs === undefined;

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  const getUserName = (id: string) => {
    return users.find((u: any) => u.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">User</label>
              <select
                className="flex h-10 w-[200px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
              >
                <option value="">All Users</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Event Type</label>
              <select
                className="flex h-10 w-[200px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value as typeof filterEvent)}
              >
                <option value="">All Events</option>
                <option value="COMMAND_SUBMITTED">Command Submitted</option>
                <option value="COMMAND_EXECUTED">Command Executed</option>
                <option value="COMMAND_REJECTED">Command Rejected</option>
                <option value="RULE_CREATED">Rule Created</option>
                <option value="USER_CREATED">User Created</option>
                <option value="CREDITS_UPDATED">Credits Updated</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="w-[160px]"
              />
            </div>
            <Button className="mb-0.5">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Command ID</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">No logs found.</TableCell></TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log._id}>
                    <TableCell className="text-sm text-slate-500">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>{getUserName(log.user_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.event_type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.command_id ? log.command_id.substring(0, 8) + '...' : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Type:</span> {selectedLog.event_type}
                </div>
                <div>
                  <span className="font-semibold">Time:</span> {format(new Date(selectedLog.created_at), "PPpp")}
                </div>
                <div>
                   <span className="font-semibold">User ID:</span> <span className="font-mono text-xs">{selectedLog.user_id}</span>
                </div>
                <div>
                   <span className="font-semibold">Command ID:</span> {selectedLog.command_id ? <span className="font-mono text-xs">{selectedLog.command_id}</span> : '-'}
                </div>
             </div>
             <div className="rounded-md bg-slate-100 p-4 font-mono text-xs overflow-auto max-h-[300px]">
               <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
             </div>
             <div className="flex justify-end">
                <Button onClick={() => setSelectedLog(null)}>Close</Button>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

