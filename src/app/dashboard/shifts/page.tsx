"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { StaffOnly } from "@/components/ui/RoleBasedRender";
import StaffNavigation from "@/components/dashboard/StaffNavigation";
import StatusIndicator from "@/components/dashboard/StatusIndicator";
import ShiftScheduleForm from "@/components/shifts/ShiftScheduleForm";
import ShiftCalendar from "@/components/shifts/ShiftCalendar";

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState<"schedule" | "calendar">("schedule");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const tabs = [
    // {
    //   id: "schedule" as const,
    //   name: "シフト提出",
    //   icon: "📅",
    //   description: "来週のシフト予定を提出",
    // },
    {
      id: "calendar" as const,
      name: "カレンダー",
      icon: "📆",
      description: "シフト予定を確認",
    },
  ];

  return (
    <ProtectedRoute>
      <StaffOnly>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">シフト管理</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <StatusIndicator />
                  <div className="text-sm text-gray-600">
                    {currentTime.toLocaleString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Navigation Sidebar */}
              <div className="lg:col-span-1">
                <StaffNavigation />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`
                            py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                            ${
                              activeTab === tab.id
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }
                          `}
                        >
                          <span className="text-lg">{tab.icon}</span>
                          <span>{tab.name}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Description */}
                  <div className="px-6 py-3 bg-gray-50">
                    <p className="text-sm text-gray-600">{tabs.find((tab) => tab.id === activeTab)?.description}</p>
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === "schedule" ? <ShiftScheduleForm /> : <ShiftCalendar />}
              </div>
            </div>
          </div>
        </div>
      </StaffOnly>
    </ProtectedRoute>
  );
}
