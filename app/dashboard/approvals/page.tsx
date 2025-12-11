"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { format } from "date-fns";
import { CheckCircle2, XCircle, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function ApprovalsPage() {
  const { user, apiKey } = useAuth();
  const { addToast } = useToast();
  
  const pendingApprovals = useQuery(
    api.queries.getPendingApprovals,
    apiKey ? { apiKey } : "skip"
  ) || [];

  const approveCommand = useMutation(api.queries.approveCommand);
  const rejectCommand = useMutation(api.queries.rejectCommand);
  const castVote = useMutation(api.queries.castVote);

  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [approveReason, setApproveReason] = useState<{ [key: string]: string }>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);

  const handleApprove = async (commandId: string) => {
    if (!apiKey) return;
    
    try {
      await approveCommand({
        apiKey,
        commandId: commandId as Id<"commands">,
        reason: approveReason[commandId] || undefined,
      });
      addToast("Command approved successfully", "success");
      setApproveReason({ ...approveReason, [commandId]: "" });
      setShowApproveModal(null);
    } catch (error: any) {
      addToast(error.message || "Failed to approve command", "error");
    }
  };

  const handleReject = async (commandId: string) => {
    if (!apiKey || !rejectReason[commandId]?.trim()) {
      addToast("Please provide a rejection reason", "error");
      return;
    }
    
    try {
      await rejectCommand({
        apiKey,
        commandId: commandId as Id<"commands">,
        reason: rejectReason[commandId],
      });
      addToast("Command rejected successfully", "success");
      setRejectReason({ ...rejectReason, [commandId]: "" });
      setShowRejectModal(null);
    } catch (error: any) {
      addToast(error.message || "Failed to reject command", "error");
    }
  };

  const handleVote = async (commandId: string, voteType: "approve" | "reject") => {
    if (!apiKey) return;
    
    try {
      await castVote({
        apiKey,
        commandId: commandId as Id<"commands">,
        voteType,
      });
      addToast(`Vote cast: ${voteType}`, "success");
    } catch (error: any) {
      addToast(error.message || "Failed to cast vote", "error");
    }
  };

  const getUserVote = (command: any) => {
    if (!user || !command.votes) return null;
    const vote = command.votes.find((v: any) => v.user_id === user.id);
    return vote ? vote.vote_type : null;
  };

  if (!user || user.role !== "admin") {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and approve or reject commands that require approval
        </p>
      </div>

      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No pending approvals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((cmd: any) => {
            const userVote = getUserVote(cmd);
            const voteCounts = cmd.voteCounts || { approve: 0, reject: 0, total: 0 };
            const hasThreshold = cmd.voting_threshold && cmd.voting_threshold > 0;
            const thresholdMet = hasThreshold && voteCounts.approve >= cmd.voting_threshold;

            return (
              <Card key={cmd._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-mono text-sm">
                        {cmd.command_text}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span>Cost: {cmd.cost} credits</span>
                          <span>Created: {format(new Date(cmd.created_at), "MMM d, yyyy HH:mm:ss")}</span>
                          {cmd.matched_rule_id && (
                            <span>Rule: {cmd.matched_rule_id.substring(0, 8)}...</span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge variant="warning">Needs Approval</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Voting Section */}
                    {hasThreshold && (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-slate-600" />
                            <span className="text-sm font-medium">Voting System Active</span>
                          </div>
                          <Badge variant={thresholdMet ? "success" : "secondary"}>
                            {voteCounts.approve}/{cmd.voting_threshold} votes needed
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{voteCounts.approve} approve</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span className="text-sm">{voteCounts.reject} reject</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={userVote === "approve" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleVote(cmd._id, "approve")}
                            disabled={thresholdMet}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Vote Approve
                          </Button>
                          <Button
                            variant={userVote === "reject" ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleVote(cmd._id, "reject")}
                            disabled={thresholdMet}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Vote Reject
                          </Button>
                        </div>
                        {thresholdMet && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Threshold met - command will be auto-approved
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!showApproveModal && !showRejectModal && (
                        <>
                          <Button
                            variant="default"
                            onClick={() => setShowApproveModal(cmd._id)}
                            disabled={thresholdMet}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => setShowRejectModal(cmd._id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {showApproveModal === cmd._id && (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder="Optional approval reason..."
                            value={approveReason[cmd._id] || ""}
                            onChange={(e) =>
                              setApproveReason({ ...approveReason, [cmd._id]: e.target.value })
                            }
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(cmd._id)}
                            >
                              Confirm Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowApproveModal(null);
                                setApproveReason({ ...approveReason, [cmd._id]: "" });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {showRejectModal === cmd._id && (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder="Rejection reason (required)..."
                            value={rejectReason[cmd._id] || ""}
                            onChange={(e) =>
                              setRejectReason({ ...rejectReason, [cmd._id]: e.target.value })
                            }
                            rows={2}
                            required
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(cmd._id)}
                            >
                              Confirm Reject
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowRejectModal(null);
                                setRejectReason({ ...rejectReason, [cmd._id]: "" });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

