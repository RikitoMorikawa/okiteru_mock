"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("[Home] useEffect triggered", { loading, user: user?.role });
    if (!loading && user) {
      console.log("[Home] User authenticated, role:", user.role);
      if (user.role === "manager") {
        console.log("[Home] Redirecting to manager dashboard");
        router.push("/manager");
      } else {
        console.log("[Home] Redirecting to staff dashboard");
        router.push("/dashboard/attendance");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    console.log("[Home] Showing loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (user) {
    console.log("[Home] User found, should redirect but showing null");
    return null; // Will redirect
  }

  console.log("[Home] No user, showing login page");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Staff Management System</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">スタッフ管理システム</h2>
        <p className="text-gray-600 mb-8">通信事業部向けのスタッフ管理システムです</p>

        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          ログイン
        </Link>
      </div>
    </main>
  );
}
