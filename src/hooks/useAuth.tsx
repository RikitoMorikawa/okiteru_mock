"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: "manager" | "staff";
  name: string;
  phone?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (userId?: string) => {
    console.log("[refreshUser] Starting with userId:", userId);
    try {
      let uid = userId;

      // If no userId provided, get from session
      if (!uid) {
        console.log("[refreshUser] No userId, getting session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id;
        console.log("[refreshUser] Session userId:", uid);
      }

      if (!uid) {
        console.log("[refreshUser] No uid found, setting user to null");
        setUser(null);
        return;
      }

      // Get user profile from database
      console.log("[refreshUser] Fetching profile for uid:", uid);
      const { data: profile, error } = await supabase.from("users").select("*").eq("id", uid).single();

      console.log("[refreshUser] Profile result:", { profile, error });

      if (error || !profile) {
        console.error("[refreshUser] Profile fetch error:", error);
        setUser(null);
        return;
      }

      console.log("[refreshUser] Setting user state");
      setUser({
        id: (profile as any).id,
        email: (profile as any).email,
        role: (profile as any).role,
        name: (profile as any).name,
        phone: (profile as any).phone,
      });
      console.log("[refreshUser] User state set successfully");
    } catch (error) {
      console.error("[refreshUser] Exception:", error);
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("[signIn] Starting...");

    // Add timeout to detect if it hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("signInWithPassword timeout after 10s")), 10000);
    });

    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("[signIn] Waiting for auth response...");
    const { data, error } = (await Promise.race([signInPromise, timeoutPromise])) as any;

    console.log("[signIn] Auth response received:", { user: data?.user?.id, error });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      console.log("[signIn] Calling refreshUser with userId:", data.user.id);
      await refreshUser(data.user.id);
      console.log("[signIn] refreshUser completed");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    console.log("[useAuth] useEffect initializing...");
    // Simple initial load
    refreshUser().finally(() => {
      console.log("[useAuth] Initial load complete, setting loading to false");
      setLoading(false);
    });

    // Listen for auth changes
    console.log("[useAuth] Setting up onAuthStateChange listener...");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Auth state change detected:", event, session?.user?.id);

      // Don't call refreshUser during sign in - it will be called explicitly
      if (event === "SIGNED_OUT") {
        console.log("[useAuth] User signed out, clearing user state");
        setUser(null);
      }
      // Remove the SIGNED_IN handler to prevent double refresh
    });

    return () => {
      console.log("[useAuth] Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
