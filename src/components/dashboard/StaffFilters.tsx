"use client";

interface FilterOptions {
  search: string;
  status: "all" | "active" | "inactive" | "alerts";
  sortBy: "name" | "status" | "lastActivity";
}

interface StaffFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export default function StaffFilters({ filters, onFiltersChange }: StaffFiltersProps) {
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
  };

  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
      <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <label htmlFor="search" className="sr-only">
            スタッフを検索
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              placeholder="名前で検索..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-8 sm:pl-10 pr-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Status Filter */}
          <div className="flex-1 sm:flex-none">
            <label htmlFor="status-filter" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:hidden">
              ステータス
            </label>
            <label htmlFor="status-filter" className="hidden sm:block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value as FilterOptions["status"])}
              className="block w-full pl-2 sm:pl-3 pr-8 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md appearance-none bg-white"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: "right 0.5rem center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="all">すべて</option>
              <option value="active">活動中</option>
              <option value="inactive">未活動</option>
              <option value="alerts">アラート</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-2 sm:mt-4 flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">アクティブフィルター:</span>

          {filters.search && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="sm:hidden">検索</span>
              <span className="hidden sm:inline">検索: &quot;{filters.search}&quot;</span>
              <button
                onClick={() => handleSearchChange("")}
                className="ml-1 inline-flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
              >
                <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {filters.status !== "all" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="sm:hidden">{getStatusLabel(filters.status)}</span>
              <span className="hidden sm:inline">ステータス: {getStatusLabel(filters.status)}</span>
              <button
                onClick={() => handleStatusChange("all")}
                className="ml-1 inline-flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600"
              >
                <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: FilterOptions["status"]): string {
  switch (status) {
    case "active":
      return "活動中";
    case "inactive":
      return "未活動";
    case "alerts":
      return "アラート有り";
    default:
      return "すべて";
  }
}
