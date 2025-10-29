"use client";

import { useState } from "react";
import { FilterOptions } from "@/types/database";

interface StaffFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export default function StaffFilters({ filters, onFiltersChange }: StaffFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleStatusChange = (status: FilterOptions["status"]) => {
    onFiltersChange({ ...filters, status });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      sortBy: "name", // Keep for compatibility
    });
    setShowFilters(false); // Close filters when clearing
  };

  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filter Toggle Header */}
      <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-100">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-md transition-colors ${
              showFilters || hasActiveFilters ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="text-xs font-medium">フィルター</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-blue-600 rounded-full">
                {(filters.search ? 1 : 0) + (filters.status !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="sm:hidden">×</span>
            <span className="hidden sm:inline">クリア</span>
          </button>
        )}
      </div>

      {/* Collapsible Filter Content */}
      {showFilters && (
        <div className="p-2 sm:p-3 space-y-3">
          {/* Search Field */}
          <div>
            <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">
              検索
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search"
                type="text"
                placeholder="名前で検索..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="block w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded-md leading-4 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value as FilterOptions["status"])}
              className="block w-full pl-2 pr-8 py-1.5 text-xs border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.2em 1.2em",
              }}
            >
              <option value="all">すべて</option>
              <option value="active_staff">活動予定のスタッフ</option>
              <option value="inactive_staff">非活動のスタッフ</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
