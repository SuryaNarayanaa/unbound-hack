"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { Rule } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Edit, AlertTriangle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function RulesPage() {
  const { user, apiKey } = useAuth();
  const { addToast } = useToast();
  
  const allRules = useQuery(
    api.queries.listRules,
    apiKey ? { apiKey } : "skip"
  ) || [];
  
  const rules = useMemo(() => {
    return [...allRules].sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
  }, [allRules]);
  
  const isLoading = allRules === undefined;

  const createRule = useMutation(api.queries.createRule);
  const updateRule = useMutation(api.queries.updateRule);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pattern, setPattern] = useState("");
  const [action, setAction] = useState<"AUTO_ACCEPT" | "AUTO_REJECT" | "REQUIRE_APPROVAL">("REQUIRE_APPROVAL");
  const [priority, setPriority] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const validateRegex = (pat: string) => {
    try {
      new RegExp(pat);
      setRegexError(null);
      return true;
    } catch (e) {
      setRegexError("Invalid Regular Expression");
      return false;
    }
  };

  const checkConflict = (pat: string) => {
    const duplicate = rules.find(r => r.pattern === pat && r._id !== editingId);
    if (duplicate) {
        setConflictWarning("A rule with this exact pattern already exists.");
    } else {
        setConflictWarning(null);
    }
  }

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPattern(val);
    if (val) {
        validateRegex(val);
        checkConflict(val);
    } else {
        setRegexError(null);
        setConflictWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegex(pattern) || !apiKey) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateRule({
          apiKey,
          ruleId: editingId as Id<"rules">,
          pattern,
          action,
          priority,
          enabled,
        });
        addToast("Rule updated successfully", "success");
      } else {
        await createRule({
          apiKey,
          pattern,
          action,
          priority,
          enabled,
        });
        addToast("Rule created successfully", "success");
      }
      
      resetForm();
    } catch (error: any) {
      addToast(error.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPattern("");
    setAction("REQUIRE_APPROVAL");
    setPriority(10);
    setEnabled(true);
    setRegexError(null);
    setConflictWarning(null);
  };

  const handleEdit = (rule: Rule) => {
    setEditingId(rule._id);
    setPattern(rule.pattern || "");
    setAction(rule.action || "REQUIRE_APPROVAL");
    setPriority(rule.priority ?? 10);
    setEnabled(rule.enabled ?? true);
    setRegexError(null);
    setConflictWarning(null); // Don't warn about itself
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleRule = async (rule: Rule) => {
    if (!apiKey) return;
    try {
      await updateRule({
        apiKey,
        ruleId: rule._id as Id<"rules">,
        enabled: !(rule.enabled ?? true),
      });
      addToast(`Rule ${!(rule.enabled ?? true) ? "enabled" : "disabled"}`, "success");
    } catch (error) {
      addToast("Failed to update rule", "error");
    }
  };

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Rule" : "Create New Rule"}</CardTitle>
          <CardDescription>Define how commands are processed based on regex patterns.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pattern (Regex)</label>
                <Input 
                  value={pattern} 
                  onChange={handlePatternChange} 
                  placeholder="^list.*" 
                  className={regexError ? "border-red-500" : conflictWarning ? "border-amber-500" : "font-mono"}
                />
                {regexError && <p className="text-xs text-red-500">{regexError}</p>}
                {conflictWarning && !regexError && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {conflictWarning}
                    </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Action</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  value={action}
                  onChange={(e: any) => setAction(e.target.value)}
                >
                  <option value="REQUIRE_APPROVAL">Require Approval</option>
                  <option value="AUTO_ACCEPT">Auto Accept</option>
                  <option value="AUTO_REJECT">Auto Reject</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority (Higher runs first)</label>
                <Input 
                  type="number" 
                  value={priority} 
                  onChange={(e) => setPriority(parseInt(e.target.value))} 
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <input
                  type="checkbox"
                  id="enabled"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <label htmlFor="enabled" className="text-sm font-medium">Enabled</label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            )}
            <Button 
              type="submit" 
              disabled={isSubmitting || !pattern || !!regexError} 
              isLoading={isSubmitting}
            >
              {editingId ? "Update Rule" : "Create Rule"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : rules.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-slate-500">No rules defined.</TableCell></TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule._id} className={!rule.enabled ? "opacity-60" : ""}>
                    <TableCell>{rule.priority ?? 0}</TableCell>
                    <TableCell className="font-mono">{rule.pattern || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={
                        rule.action === "AUTO_ACCEPT" ? "success" :
                        rule.action === "AUTO_REJECT" ? "destructive" : "warning"
                      }>
                        {rule.action || 'UNKNOWN'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => toggleRule(rule)} title="Toggle">
                           {rule.enabled ? <div className="h-2 w-2 rounded-full bg-green-500" /> : <div className="h-2 w-2 rounded-full bg-slate-300" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
