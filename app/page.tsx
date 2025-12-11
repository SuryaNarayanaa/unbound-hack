"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { useToast } from "@/contexts/ToastContext";
import { Terminal, Shield, Zap, Sparkles } from "lucide-react";

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
    <div className="flex min-h-screen">
      {/* Visual Side (Left) */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary/5 p-12 lg:flex relative overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Terminal className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">Command Gateway</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight leading-11 lg:text-6xl text-foreground">
            Execute safe.<br />
            <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Build faster.</span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground leading-relaxed">
            The enterprise-grade command execution platform for modern development teams. Secure, audited, and limitless.
          </p>

          <div className="flex gap-6 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              <span>Secure Sandboxing</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Zap className="h-5 w-5 text-primary" />
              <span>Real-time Execution</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground">© 2025 Unbound Technologies. All rights reserved.</p>
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 lg:w-1/2 text-foreground">

        {/* Mobile Header */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Terminal className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Command Gateway</h1>
        </div>

        <Card className="w-full max-w-sm border-none bg-transparent shadow-none lg:border lg:bg-card lg:shadow-xl lg:shadow-primary/5">
          <CardHeader className="space-y-1 pb-6 text-center lg:text-left">
            <CardTitle className="text-2xl font-bold tracking-tight">Access your dashboard</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Enter your secure API key to establish a session.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {/* <Label htmlFor="api-key">API Key</Label> */}
                <div className="relative">
                  <Input
                    type="password"
                    placeholder="sk_live_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isSubmitting}
                    autoFocus
                    className="h-12 pl-11 border-input bg-background/50 backdrop-blur-sm transition-all focus-visible:ring-primary focus-visible:border-primary"
                  />
                  <div className="absolute left-3 top-3 text-muted-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none text-muted-foreground cursor-pointer select-none"
                >
                  Remember this device for 30 days
                </label>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={isSubmitting || !apiKey.trim()}
                isLoading={isSubmitting}
              >
                Authenticate Session
              </Button>
            </CardFooter>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground px-8">
            By continuing, you acknowledge that you need a valid API key from your organization administrator.
          </div>
        </Card>
      </div>
    </div>
  );
}
