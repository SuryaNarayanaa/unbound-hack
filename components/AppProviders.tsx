"use client";

import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ConvexClientProvider from "./ConvexClientProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </ConvexClientProvider>
  );
}

