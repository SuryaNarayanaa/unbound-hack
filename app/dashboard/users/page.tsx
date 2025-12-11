"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";
import { User } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import { UserPlus, Settings, DollarSign, Copy } from "lucide-react";

export default function UsersPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", role: "member", initialCredits: 100 });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Credit Adjustment Modal State
  const [creditModalUser, setCreditModalUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditReason, setCreditReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") {
       // redirect handled by layout/context usually, but safe to guard
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<User[]>("/users");
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      addToast("Failed to load users", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result: any = await apiClient.post("/users", newUser);
      setGeneratedKey(result.apiKey);
      fetchUsers();
      addToast("User created successfully", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to create user", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreditAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalUser) return;
    
    setIsSubmitting(true);
    try {
      await apiClient.post(`/users/${creditModalUser.id}/credits`, {
        amount: creditAmount,
        reason: creditReason
      });
      addToast("Credits adjusted successfully", "success");
      setCreditModalUser(null);
      setCreditAmount(0);
      setCreditReason("");
      fetchUsers();
    } catch (error: any) {
      addToast(error.message || "Failed to adjust credits", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Copied to clipboard", "success");
  };

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Users & Credits</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">No users found.</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "destructive" : "secondary"}>
                        {u.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.credits}</TableCell>
                    <TableCell className="text-slate-500">
                      {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCreditModalUser(u)}
                      >
                        <DollarSign className="mr-2 h-3 w-3" />
                        Adjust Credits
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
            setIsCreateModalOpen(false);
            setGeneratedKey(null);
            setNewUser({ name: "", role: "member", initialCredits: 100 });
        }}
        title="Create New User"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Settings className="h-5 w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">API Key Generated</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>This key will only be shown once. Please copy it now.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Input value={generatedKey} readOnly className="font-mono bg-slate-50" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => {
                setIsCreateModalOpen(false);
                setGeneratedKey(null);
                setNewUser({ name: "", role: "member", initialCredits: 100 });
            }}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newUser.name} 
                onChange={(e) => setNewUser({...newUser, name: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Credits</label>
              <Input 
                type="number"
                value={newUser.initialCredits} 
                onChange={(e) => setNewUser({...newUser, initialCredits: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting || !newUser.name} isLoading={isSubmitting}>
                Create User
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Adjust Credits Modal */}
      <Modal 
        isOpen={!!creditModalUser} 
        onClose={() => setCreditModalUser(null)}
        title={`Adjust Credits for ${creditModalUser?.name}`}
      >
        <form onSubmit={handleCreditAdjustment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (positive to add, negative to remove)</label>
            <Input 
              type="number" 
              value={creditAmount} 
              onChange={(e) => setCreditAmount(parseInt(e.target.value))}
              placeholder="0"
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Input 
              value={creditReason} 
              onChange={(e) => setCreditReason(e.target.value)}
              placeholder="e.g. Bonus, Refund, Penalty"
              required 
            />
          </div>
          <div className="flex justify-end pt-4 gap-2">
             <Button type="button" variant="outline" onClick={() => setCreditModalUser(null)}>Cancel</Button>
             <Button type="submit" disabled={isSubmitting || creditAmount === 0 || !creditReason} isLoading={isSubmitting}>
               Confirm Adjustment
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

