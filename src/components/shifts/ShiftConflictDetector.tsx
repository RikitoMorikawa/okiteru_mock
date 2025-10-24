"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShiftSchedule, User } from "@/types/database";

interface ShiftWithStaff extends ShiftSchedule {
  staff: User;
}

interface ShiftConflict {
  type: "overlap" | "double_booking" | "excessive_hours";
  shifts: ShiftWithStaff[];
  message: string;
  severity: "high" | "medium" | "low";
}

interface ShiftConflictDetectorProps {
  shifts: ShiftWithStaff[];
  conflicts: ShiftConflict[];
  onResolve: () => void;
}

export default function ShiftConflictDetector({ shifts, conflicts, onResolve }: ShiftConflictDetectorProps) {
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());
  const [selectedConflict, setSelectedConflict] = useState<ShiftConflict | null>(null);

  // Enhanced conflict detection
  const detectAllConflicts = (): ShiftConflict[] => {
    const detectedConflicts: ShiftConflict[] = [];

    // Group shifts by staff and date
    const shiftsByStaffAndDate = new Map<string, ShiftWithStaff[]>();
    const shiftsByStaff = new Map<string, ShiftWithStaff[]>();

    shifts.forEach((shift) => {
      const dateKey = `${shift.staff_id}-${shift.date}`;
      if (!shiftsByStaffAndDate.has(dateKey)) {
        shiftsByStaffAndDate.set(dateKey, []);
      }
      shiftsByStaffAndDate.get(dateKey)!.push(shift);

      if (!shiftsByStaff.has(shift.staff_id)) {
        shiftsByStaff.set(shift.staff_id, []);
      }
      shiftsByStaff.get(shift.staff_id)!.push(shift);
    });

    // Check for time overlaps and double bookings
    shiftsByStaffAndDate.forEach((staffShifts, key) => {
      if (staffShifts.length > 1) {
        staffShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));

        for (let i = 0; i < staffShifts.length - 1; i++) {
          const current = staffShifts[i];
          const next = staffShifts[i + 1];

          // Check for time overlap
          if (current.end_time > next.start_time) {
            detectedConflicts.push({
              type: "overlap",
              shifts: [current, next],
              message: `${current.staff.name}さんのシフトが重複しています (${new Date(current.date).toLocaleDateString("ja-JP")})`,
              severity: "high",
            });
          }
        }

        // Check for excessive shifts on same day
        if (staffShifts.length > 2) {
          detectedConflicts.push({
            type: "double_booking",
            shifts: staffShifts,
            message: `${staffShifts[0].staff.name}さんが同日に${staffShifts.length}つのシフトが登録されています`,
            severity: "medium",
          });
        }
      }
    });

    // Check for excessive weekly hours
    shiftsByStaff.forEach((staffShifts, staffId) => {
      const weeklyHours = new Map<string, { shifts: ShiftWithStaff[]; totalHours: number }>();

      staffShifts.forEach((shift) => {
        const shiftDate = new Date(shift.date);
        const weekStart = new Date(shiftDate);
        weekStart.setDate(shiftDate.getDate() - shiftDate.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weeklyHours.has(weekKey)) {
          weeklyHours.set(weekKey, { shifts: [], totalHours: 0 });
        }

        const weekData = weeklyHours.get(weekKey)!;
        weekData.shifts.push(shift);

        // Calculate shift duration
        const start = new Date(`2000-01-01T${shift.start_time}`);
        const end = new Date(`2000-01-01T${shift.end_time}`);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        weekData.totalHours += duration;
      });

      // Check for excessive weekly hours (over 40 hours)
      weeklyHours.forEach((weekData, weekKey) => {
        if (weekData.totalHours > 40) {
          detectedConflicts.push({
            type: "excessive_hours",
            shifts: weekData.shifts,
            message: `${weekData.shifts[0].staff.name}さんの週間労働時間が${weekData.totalHours.toFixed(1)}時間です (週開始: ${new Date(
              weekKey
            ).toLocaleDateString("ja-JP")})`,
            severity: weekData.totalHours > 50 ? "high" : "medium",
          });
        }
      });
    });

    return detectedConflicts;
  };

  const allConflicts = detectAllConflicts();

  const handleResolveConflict = async (conflict: ShiftConflict, resolution: "delete" | "modify") => {
    const conflictKey = conflict.shifts.map((s) => s.id).join("-");
    setResolvingConflicts((prev) => new Set(prev).add(conflictKey));

    try {
      if (resolution === "delete") {
        // Delete conflicting shifts (keep the first one)
        const shiftsToDelete = conflict.shifts.slice(1);
        await Promise.all(shiftsToDelete.map((shift) => (supabase as any).from("shift_schedules").delete().eq("id", shift.id)));
      } else if (resolution === "modify") {
        // For overlap conflicts, adjust the end time of the first shift
        if (conflict.type === "overlap" && conflict.shifts.length === 2) {
          const [first, second] = conflict.shifts;
          await (supabase as any).from("shift_schedules").update({ end_time: second.start_time }).eq("id", first.id);
        }
      }

      onResolve();
    } catch (error) {
      console.error("Error resolving conflict:", error);
    } finally {
      setResolvingConflicts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conflictKey);
        return newSet;
      });
    }
  };

  const getSeverityColor = (severity: ShiftConflict["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200 text-red-800";
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getSeverityIcon = (severity: ShiftConflict["severity"]) => {
    switch (severity) {
      case "high":
        return "🚨";
      case "medium":
        return "⚠️";
      case "low":
        return "ℹ️";
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (allConflicts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">競合は検出されませんでした</h3>
        <p className="text-gray-600">すべてのシフトが適切にスケジュールされています。</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">競合検出結果 ({allConflicts.length}件)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🚨</span>
              <div>
                <p className="text-sm font-medium text-red-800">高優先度</p>
                <p className="text-2xl font-bold text-red-900">{allConflicts.filter((c) => c.severity === "high").length}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">中優先度</p>
                <p className="text-2xl font-bold text-yellow-900">{allConflicts.filter((c) => c.severity === "medium").length}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <p className="text-sm font-medium text-blue-800">低優先度</p>
                <p className="text-2xl font-bold text-blue-900">{allConflicts.filter((c) => c.severity === "low").length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="space-y-4">
        {allConflicts
          .sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          })
          .map((conflict, index) => {
            const conflictKey = conflict.shifts.map((s) => s.id).join("-");
            const isResolving = resolvingConflicts.has(conflictKey);

            return (
              <div key={index} className={`border rounded-lg p-6 ${getSeverityColor(conflict.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-xl mr-2">{getSeverityIcon(conflict.severity)}</span>
                      <h4 className="text-lg font-medium">{conflict.message}</h4>
                    </div>

                    {/* Affected Shifts */}
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">影響を受けるシフト:</h5>
                      <div className="space-y-2">
                        {conflict.shifts.map((shift) => (
                          <div key={shift.id} className="bg-white bg-opacity-50 rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{shift.staff.name}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(shift.date).toLocaleDateString("ja-JP")}</span>
                                <span className="mx-2">•</span>
                                <span>
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </span>
                                {shift.location && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-gray-600">📍 {shift.location}</span>
                                  </>
                                )}
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  shift.status === "scheduled"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : shift.status === "confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {shift.status === "scheduled" ? "承認待ち" : shift.status === "confirmed" ? "承認済み" : "完了"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resolution Suggestions */}
                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">解決方法:</h5>
                      <div className="flex space-x-2">
                        {conflict.type === "overlap" && (
                          <>
                            <button
                              onClick={() => handleResolveConflict(conflict, "modify")}
                              disabled={isResolving}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isResolving ? "処理中..." : "時間を調整"}
                            </button>
                            <button
                              onClick={() => handleResolveConflict(conflict, "delete")}
                              disabled={isResolving}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              {isResolving ? "処理中..." : "重複シフトを削除"}
                            </button>
                          </>
                        )}

                        {conflict.type === "double_booking" && (
                          <button
                            onClick={() => handleResolveConflict(conflict, "delete")}
                            disabled={isResolving}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {isResolving ? "処理中..." : "余分なシフトを削除"}
                          </button>
                        )}

                        {conflict.type === "excessive_hours" && (
                          <button
                            onClick={() => setSelectedConflict(conflict)}
                            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                          >
                            詳細を確認
                          </button>
                        )}

                        <button onClick={() => setSelectedConflict(conflict)} className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                          手動で解決
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Conflict Detail Modal */}
      {selectedConflict && <ConflictDetailModal conflict={selectedConflict} onClose={() => setSelectedConflict(null)} onResolve={onResolve} />}
    </div>
  );
}

// Conflict Detail Modal Component
function ConflictDetailModal({ conflict, onClose, onResolve }: { conflict: ShiftConflict; onClose: () => void; onResolve: () => void }) {
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedShifts.size === 0) return;

    setUpdating(true);
    try {
      await Promise.all(Array.from(selectedShifts).map((shiftId) => (supabase as any).from("shift_schedules").delete().eq("id", shiftId)));
      onResolve();
      onClose();
    } catch (error) {
      console.error("Error deleting shifts:", error);
    } finally {
      setUpdating(false);
    }
  };

  const toggleShiftSelection = (shiftId: string) => {
    setSelectedShifts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">競合の詳細解決</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conflict Information */}
          <div className="mb-6">
            <p className="text-gray-700 mb-4">{conflict.message}</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">影響を受けるシフト</h4>
              <div className="space-y-3">
                {conflict.shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between bg-white rounded p-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedShifts.has(shift.id)}
                        onChange={() => toggleShiftSelection(shift.id)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-3"
                      />
                      <div>
                        <div className="font-medium">{shift.staff.name}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(shift.date).toLocaleDateString("ja-JP")} •{formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          {shift.location && ` • 📍 ${shift.location}`}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        shift.status === "scheduled"
                          ? "bg-yellow-100 text-yellow-800"
                          : shift.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {shift.status === "scheduled" ? "承認待ち" : shift.status === "confirmed" ? "承認済み" : "完了"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              キャンセル
            </button>
            {selectedShifts.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {updating ? "削除中..." : `選択したシフトを削除 (${selectedShifts.size}件)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
