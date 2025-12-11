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
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNC0yLTItNCAwLTQgMi00IDQgMiA0IDIgNCAyIDIgNCAyIDRzMi0yIDQtMiA0LTIgMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Command Gateway</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Execute commands<br />
            <span className="text-violet-200">with confidence</span>
          </h1>
          
          <p className="text-lg text-violet-100/80 max-w-md mb-8">
            A secure gateway for managing and executing commands with fine-grained access control, 
            audit logging, and credit-based usage.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-violet-100">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>Rule-based command validation</span>
            </div>
            <div className="flex items-center gap-3 text-violet-100">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>Real-time audit logging</span>
            </div>
            <div className="flex items-center gap-3 text-violet-100">
              <div className="p-2 bg-white/10 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>Credit-based access control</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-violet-600 rounded-xl">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Command Gateway</span>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {flow === "signIn" ? "Welcome back" : "Create account"}
              </h2>
              <p className="text-slate-500">
                {flow === "signIn" 
                  ? "Enter your credentials to continue"
                  : "Get started with a new account"}
              </p>
            </div>
            
            <button
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-3 px-4 border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
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
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Please wait..." : "Continue with Google"}
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-sm text-slate-400 font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-slate-200"></div>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border-2 border-slate-200 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  minLength={8}
                  required
                  className="w-full bg-slate-50 text-slate-900 rounded-xl px-4 py-3 border-2 border-slate-200 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 outline-none transition-all placeholder:text-slate-400"
                />
                {flow === "signUp" && (
                  <p className="text-xs text-slate-500 mt-1.5 px-1">
                    Must be at least 8 characters
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Please wait...
                  </span>
                ) : (
                  flow === "signIn" ? "Sign in" : "Create account"
                )}
              </button>
              
              <div className="flex flex-row gap-1.5 text-sm justify-center pt-4">
                <span className="text-slate-500">
                  {flow === "signIn" ? "Don't have an account?" : "Already have an account?"}
                </span>
                <button
                  type="button"
                  className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
                  onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
                >
                  {flow === "signIn" ? "Sign up" : "Sign in"}
                </button>
              </div>
              
              {error && (
                <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 mt-2">
                  <p className="text-red-600 font-medium text-sm text-center">
                    {error}
                  </p>
                </div>
              )}
            </form>
          </div>
          
          <p className="text-center text-sm text-slate-400 mt-6">
            By continuing, you agree to our terms of service
          </p>
        </div>
      </div>
    </div>
  );
}
