"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";
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
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  
  // Submit state
  const [commandText, setCommandText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History state
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const fetchCommands = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const data = await apiClient.get<Command[]>("/commands", params);
      setCommands(data);
    } catch (error) {
      console.error("Failed to fetch commands:", error);
      addToast("Failed to load command history", "error");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  const handleSubmit = async () => {
    if (!commandText.trim()) return;

    setIsSubmitting(true);
    try {
      const result: any = await apiClient.post("/commands", { command_text: commandText });
      
      addToast(
        result.status === "executed" 
          ? "Command executed successfully" 
          : result.status === "rejected" 
          ? `Command rejected: ${result.rejection_reason || "Unknown reason"}`
          : "Command submitted for approval",
        result.status === "executed" ? "success" : result.status === "rejected" ? "error" : "info"
      );

      setCommandText("");
      // Refresh history and user credits
      fetchCommands();
      refreshUser();
    } catch (error: any) {
      addToast(error.message || "Failed to submit command", "error");
    } finally {
      setIsSubmitting(false);
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
            disabled={isSubmitting || !commandText.trim()}
            isLoading={isSubmitting}
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
            <Button variant="outline" size="sm" onClick={fetchCommands} disabled={isLoading}>
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
                  commands.map((cmd) => (
                    <TableRow key={cmd._id}>
                      <TableCell className="font-mono text-xs">
                        {cmd.command_text}
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
                          {cmd.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {cmd.matched_rule_id ? cmd.matched_rule_id.substring(0, 8) + '...' : '-'}
                      </TableCell>
                      <TableCell>{cmd.cost}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {format(new Date(cmd.created_at), "MMM d, HH:mm:ss")}
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

