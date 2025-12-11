"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | undefined;
  role: "admin" | "member" | undefined;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (key: string, remember: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  apiKey: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const router = useRouter();

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem("command_gateway_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  // Fetch user using Convex query
  const userData = useQuery(
    api.queries.getMe,
    apiKey ? { apiKey } : "skip"
  );

  const isLoading = apiKey !== null && userData === undefined;

  // Clear API key if query fails (invalid key)
  useEffect(() => {
    if (apiKey && userData === null && !isLoading) {
      // Query returned null, which means invalid API key
      setApiKey(null);
      localStorage.removeItem("command_gateway_api_key");
    }
  }, [apiKey, userData, isLoading]);

  const login = async (key: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem("command_gateway_api_key", key);
    }
    setApiKey(key);
    // Wait a bit for the query to execute
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push("/dashboard");
  };

  const logout = () => {
    setApiKey(null);
    localStorage.removeItem("command_gateway_api_key");
    router.push("/");
  };

  const refreshUser = () => {
    // Convex queries automatically refetch, but we can trigger a refetch by updating the key
    // For now, just rely on automatic refetching
  };

  const user: User | null = userData ? {
    id: userData.id,
    name: userData.name || "",
    role: userData.role || "member",
    credits: userData.credits,
  } : null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, apiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

