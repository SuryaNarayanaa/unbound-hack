"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsSubmitting(true);
    try {
      await login(apiKey, remember);
      addToast("Successfully authenticated", "success");
    } catch (error: any) {
      addToast(error.message || "Invalid API Key", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc] p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0 bg-white">
        <CardHeader className="space-y-1 pb-6 pt-8">
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 text-center">Command Gateway</CardTitle>
          <CardDescription className="text-slate-500 text-center text-base">Enter your API key to continue</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="sk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className="h-12 border-slate-200 focus:border-[#8b5cf6] focus:ring-[#8b5cf6] rounded-xl text-lg placeholder:text-slate-300"
              />
            </div>
            <div className="flex items-center space-x-3 px-1">
              <input
                type="checkbox"
                id="remember"
                className="h-5 w-5 rounded border-slate-300 text-[#8b5cf6] focus:ring-[#8b5cf6] cursor-pointer"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isSubmitting}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Remember key
              </label>
            </div>
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white h-12 rounded-xl text-base font-semibold transition-all shadow-lg shadow-purple-500/20"
              disabled={isSubmitting || !apiKey.trim()}
              isLoading={isSubmitting}
            >
              Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
