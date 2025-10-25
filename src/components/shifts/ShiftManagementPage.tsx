"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ShiftSchedule, User } from "@/types/database";
import ShiftCalendarOverview from "./ShiftCalendarOverview";
import ShiftApprovalQueue from "./ShiftApprovalQueue";
import ShiftConflictDetector from "./ShiftConflictDetector";

interface ShiftWithStaff extends ShiftSchedule {
  staff: User;
}

export default function ShiftManagementPage() {
  const [activeTab, setActiveTab] = useState<"calendar" | "approvals" | "conflicts">("calendar");
  const [shifts, setShifts] = useState<ShiftWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const fetchShifts = async () => {
    try {
      setLoading(true);

      // Calculate date range for current month
      const startOfMonth = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1);
      const endOfMonth = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0);

      const startDate = startOfMonth.toISOString().split("T")[0];
      const endDate = endOfMonth.toISOString().split("T")[0];

      // Fetch shifts with staff information
      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shift_schedules")
        .select(
          `
          *,
          staff:users!shift_schedules_staff_id_fkey(*)
        `
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (shiftsError) throw shiftsError;

      setShifts((shiftsData as ShiftWithStaff[]) || []);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get statistics
  const getStats = () => {
    const totalShifts = shifts.length;
    const pendingApprovals = shifts.filter((shift) => shift.status === "scheduled").length;
    const confirmedShifts = shifts.filter((shift) => shift.status === "confirmed").length;
    const completedShifts = shifts.filter((shift) => shift.status === "completed").length;

    // Detect conflicts
    const conflicts = detectShiftConflicts(shifts);

    return {
      totalShifts,
      pendingApprovals,
      confirmedShifts,
      completedShifts,
      conflicts: conflicts.length,
    };
  };

  // Detect shift conflicts
  const detectShiftConflicts = (shifts: ShiftWithStaff[]) => {
    const conflicts: Array<{
      type: "overlap" | "double_booking";
      shifts: ShiftWithStaff[];
      message: string;
      severity: "high" | "medium" | "low";
    }> = [];

    // Group shifts by staff and date
    const shiftsByStaffAndDate = new Map<string, ShiftWithStaff[]>();

    shifts.forEach((shift) => {
      const key = `${shift.staff_id}-${shift.date}`;
      if (!shiftsByStaffAndDate.has(key)) {
        shiftsByStaffAndDate.set(key, []);
      }
      shiftsByStaffAndDate.get(key)!.push(shift);
    });

    // Check for conflicts within each staff-date group
    shiftsByStaffAndDate.forEach((staffShifts, key) => {
      if (staffShifts.length > 1) {
        // Sort by start time
        staffShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));

        for (let i = 0; i < staffShifts.length - 1; i++) {
          const current = staffShifts[i];
          const next = staffShifts[i + 1];

          // Check for time overlap
          if (current.end_time > next.start_time) {
            conflicts.push({
              type: "overlap",
              shifts: [current, next],
              message: `${current.staff.name}さんのシフトが重複しています (${new Date(current.date).toLocaleDateString("ja-JP")})`,
              severity: "high",
            });
          }
        }

        // Check for double booking (multiple shifts on same day)
        if (staffShifts.length > 2) {
          conflicts.push({
            type: "double_booking",
            shifts: staffShifts,
            message: `${staffShifts[0].staff.name}さんが同日に${staffShifts.length}つのシフトが登録されています`,
            severity: "medium",
          });
        }
      }
    });

    return conflicts;
  };

  // Handle shift approval
  const handleShiftApproval = async (shiftId: string, action: "approve" | "reject") => {
    try {
      const newStatus = action === "approve" ? "confirmed" : "scheduled";

      const { error } = await (supabase as any).from("shift_schedules").update({ status: newStatus }).eq("id", shiftId);

      if (error) throw error;

      // Refresh shifts
      await fetchShifts();
    } catch (error) {
      console.error("Error updating shift:", error);
    }
  };

  useEffect(() => {
    fetchShifts();

    // Set up real-time subscription
    const subscription = supabase
      .channel("shift_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_schedules" }, () => {
        fetchShifts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentWeek]);

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/manager" className="text-gray-400 hover:text-gray-600 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900">シフト管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchShifts}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                更新
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="総シフト数" value={stats.totalShifts} icon="📅" color="blue" />
          <StatCard title="承認待ち" value={stats.pendingApprovals} icon="⏳" color={stats.pendingApprovals > 0 ? "yellow" : "gray"} />
          <StatCard title="承認済み" value={stats.confirmedShifts} icon="✅" color="green" />
          <StatCard title="完了" value={stats.completedShifts} icon="🏁" color="purple" />
          <StatCard title="競合" value={stats.conflicts} icon="⚠️" color={stats.conflicts > 0 ? "red" : "gray"} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: "calendar", label: "カレンダー表示", icon: "📅" },
                { id: "approvals", label: "承認待ち", icon: "⏳", badge: stats.pendingApprovals },
                { id: "conflicts", label: "競合検出", icon: "⚠️", badge: stats.conflicts },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                    activeTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">シフトデータを読み込み中...</span>
              </div>
            ) : (
              <>
                {activeTab === "calendar" && (
                  <ShiftCalendarOverview shifts={shifts} currentWeek={currentWeek} onWeekChange={setCurrentWeek} onShiftUpdate={fetchShifts} />
                )}
                {activeTab === "approvals" && (
                  <ShiftApprovalQueue shifts={shifts.filter((shift) => shift.status === "scheduled")} onApproval={handleShiftApproval} />
                )}
                {activeTab === "conflicts" && <ShiftConflictDetector shifts={shifts} conflicts={detectShiftConflicts(shifts)} onResolve={fetchShifts} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-2xl">{icon}</span>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
