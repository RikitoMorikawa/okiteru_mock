"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";

export default function ManagerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[ManagerPage] useEffect triggered", { loading, user: user?.role });

    if (!loading) {
      if (!user) {
        console.log("[ManagerPage] No user, redirecting to login");
        router.push("/login");
      } else if (user.role !== "manager") {
        console.log("[ManagerPage] User is not manager, redirecting to dashboard");
        router.push("/dashboard/attendance");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "manager") {
    return null; // Will redirect
  }

  return <ManagerDashboard />;
}
