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

  const handleSortChange = (sortBy: FilterOptions["sortBy"]) => {
    onFiltersChange({ ...filters, sortBy });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      sortBy: "name",
    });
  };

  const hasActiveFilters = filters.search || filters.status !== "all" || filters.sortBy !== "name";

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <label htmlFor="search" className="sr-only">
            スタッフを検索
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              placeholder="名前またはメールアドレスで検索..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleStatusChange(e.target.value as FilterOptions["status"])}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">すべて</option>
              <option value="active">活動中</option>
              <option value="inactive">未活動</option>
              <option value="alerts">アラート有り</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sort-filter" className="block text-sm font-medium text-gray-700 mb-1">
              並び順
            </label>
            <select
              id="sort-filter"
              value={filters.sortBy}
              onChange={(e) => handleSortChange(e.target.value as FilterOptions["sortBy"])}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="name">名前順</option>
              <option value="status">ステータス順</option>
              <option value="lastActivity">最終活動順</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                クリア
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">アクティブフィルター:</span>

          {filters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              検索: &quot;{filters.search}&quot;
              <button
                onClick={() => handleSearchChange("")}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {filters.status !== "all" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ステータス: {getStatusLabel(filters.status)}
              <button
                onClick={() => handleStatusChange("all")}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {filters.sortBy !== "name" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              並び順: {getSortLabel(filters.sortBy)}
              <button
                onClick={() => handleSortChange("name")}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function getSortLabel(sortBy: FilterOptions["sortBy"]): string {
  switch (sortBy) {
    case "status":
      return "ステータス順";
    case "lastActivity":
      return "最終活動順";
    default:
      return "名前順";
  }
}
