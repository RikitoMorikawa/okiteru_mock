"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { User } from "@/types/database";
import ShiftMonthlyCalendar from "@/components/shifts/ShiftMonthlyCalendar";

export default function UserShiftPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [staffUser, setStaffUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "manager") {
        router.push("/dashboard/attendance");
      }
    }
  }, [user, authLoading, router]);

  // Fetch staff user data
  useEffect(() => {
    const fetchStaffUser = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) throw error;
        setStaffUser(data as User);
      } catch (error) {
        console.error("Error fetching staff user:", error);
        alert("ユーザー情報の取得に失敗しました");
        router.push("/manager/shifts");
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "manager") {
      fetchStaffUser();
    }
  }, [userId, user, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "manager" || !staffUser) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/manager/shifts" className="text-gray-400 hover:text-gray-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-gray-900">
                  {staffUser.name}のシフト管理
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">{staffUser.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ShiftMonthlyCalendar userId={userId} userName={staffUser.name} />
      </div>
    </div>
  );
}
