"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Terminal, Sparkles } from "lucide-react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Rule-based Validation</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Real-time Audit Logs</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground">© 2025 Unbound Technologies. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
              <Terminal className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-foreground">Command Gateway</span>
          </div>

          <div className="bg-card rounded-2xl shadow-none border-none lg:border lg:border-border lg:shadow-xl lg:shadow-primary/5 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                {flow === "signIn" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-muted-foreground">
                {flow === "signIn"
                  ? "Enter your credentials to continue session"
                  : "Get started with your secure account"}
              </p>
            </div>

            <button
              className="w-full flex items-center justify-center gap-3 bg-card hover:bg-accent text-foreground font-medium rounded-xl py-3 px-4 border border-input hover:border-ring shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6 group"
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                void signIn("google")
                  .catch((error) => {
                    setError(error.message);
                    setLoading(false);
                  })
                  .then(() => {
                    router.push("/");
                  });
              }}
              disabled={loading}
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Or</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);
                const formData = new FormData(e.target as HTMLFormElement);
                formData.set("flow", flow);
                void signIn("password", formData)
                  .catch((error) => {
                    setError(error.message);
                    setLoading(false);
                  })
                  .then(() => {
                    router.push("/");
                  });
              }}
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5 ml-1">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full bg-background text-foreground rounded-xl px-4 py-3 border border-input focus:border-primary focus:bg-background/80 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="w-full bg-background text-foreground rounded-xl px-4 py-3 border border-input focus:border-primary focus:bg-background/80 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50 shadow-sm"
                />
                {flow === "signUp" && (
                  <p className="text-xs text-muted-foreground mt-1.5 px-1">
                    Must be at least 8 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-3 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  flow === "signIn" ? "Sign In" : "Create Account"
                )}
              </button>

              <div className="flex flex-row gap-1.5 text-sm justify-center pt-4">
                <span className="text-muted-foreground">
                  {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
                </span>
                <button
                  type="button"
                  className="text-primary hover:text-primary/90 font-semibold transition-colors hover:underline"
                  onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
                >
                  {flow === "signIn" ? "Sign up" : "Sign in"}
                </button>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mt-2">
                  <p className="text-destructive font-medium text-sm text-center flex items-center justify-center gap-2">
                    {error}
                  </p>
                </div>
              )}
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
