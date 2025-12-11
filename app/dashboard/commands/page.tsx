"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Command } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { RefreshCw, Filter } from "lucide-react";

export default function CommandsPage() {
  const { user, refreshUser, apiKey } = useAuth();
  const { addToast } = useToast();
  
  // Submit state
  const [commandText, setCommandText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const submitCommand = useMutation(api.queries.submitCommand);
  
  const allCommands = useQuery(
    api.queries.listCommands,
    apiKey ? { apiKey } : "skip"
  ) || [];

  const commands = useMemo(() => {
    if (statusFilter === "all") return allCommands;
    return allCommands.filter((c: any) => c.status === statusFilter);
  }, [allCommands, statusFilter]);

  const isLoading = allCommands === undefined;

  const handleSubmit = async () => {
    if (!commandText.trim() || !apiKey) return;

    try {
      const result: any = await submitCommand({
        apiKey,
        commandText: commandText.trim(),
      });
      
      addToast(
        result.status === "executed" 
          ? "Command executed successfully" 
          : result.status === "rejected" 
          ? `Command rejected: ${result.reason || "Unknown reason"}`
          : "Command submitted for approval",
        result.status === "executed" ? "success" : result.status === "rejected" ? "error" : "info"
      );

      setCommandText("");
      refreshUser();
    } catch (error: any) {
      addToast(error.message || "Failed to submit command", "error");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Command</CardTitle>
          <CardDescription>Enter a command to be processed by the gateway.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter command text..."
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            className="font-mono"
            rows={3}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
            <div className="text-sm text-slate-500">
                Current Balance: <span className="font-medium text-slate-900">{user?.credits}</span>
            </div>
          <Button 
            onClick={handleSubmit} 
            disabled={!commandText.trim() || !apiKey}
          >
            Submit Command
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-900">Command History</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-1">
                <Filter className="mr-2 h-4 w-4 text-slate-500" />
                <select 
                    className="bg-transparent text-sm outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="executed">Executed</option>
                    <option value="rejected">Rejected</option>
                    <option value="needs_approval">Needs Approval</option>
                </select>
            </div>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <Card>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Command</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Matched Rule</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : commands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No commands found.
                    </TableCell>
                  </TableRow>
                ) : (
                  commands.map((cmd: any) => (
                    <TableRow key={cmd._id}>
                      <TableCell className="font-mono text-xs">
                        {cmd.command_text || '-'}
                        {cmd.rejection_reason && (
                            <div className="mt-1 text-xs text-red-500">Reason: {cmd.rejection_reason}</div>
                        )}
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
                      <TableCell className="font-mono text-xs text-slate-500">
                        {cmd.matched_rule_id ? cmd.matched_rule_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell>{cmd.cost ?? 0}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {cmd.created_at ? format(new Date(cmd.created_at), "MMM d, HH:mm:ss") : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

