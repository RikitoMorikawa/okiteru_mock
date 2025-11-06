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
    try {
      let uid = userId;

      // If no userId provided, get from session
      if (!uid) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        uid = session?.user?.id;
      }

      if (!uid) {
        setUser(null);
        return;
      }

      // Get user profile from database
      const { data: profile, error } = await supabase.from("users").select("*").eq("id", uid).single();


      if (error || !profile) {
        console.error("[refreshUser] Profile fetch error:", error);
        setUser(null);
        return;
      }

      setUser({
        id: (profile as any).id,
        email: (profile as any).email,
        role: (profile as any).role,
        name: (profile as any).name,
        phone: (profile as any).phone,
      });
    } catch (error) {
      console.error("[refreshUser] Exception:", error);
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {

    // Add timeout to detect if it hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("signInWithPassword timeout after 10s")), 10000);
    });

    const signInPromise = supabase.auth.signInWithPassword({
      email,
      password,
    });

    const { data, error } = (await Promise.race([signInPromise, timeoutPromise])) as any;


    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      await refreshUser(data.user.id);

      // Log user access
      try {
        const { logUserAccess } = await import("@/lib/auth");
        await logUserAccess(data.user.id);
      } catch (logError) {
        console.error("[signIn] Error logging user access:", logError);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // Simple initial load
    refreshUser().finally(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      // Don't call refreshUser during sign in - it will be called explicitly
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
      // Remove the SIGNED_IN handler to prevent double refresh
    });

    return () => {
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
