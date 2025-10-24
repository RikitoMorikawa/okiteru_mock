export const appConfig = {
  name: "Staff Management System",
  description: "スタッフ管理システム - 通信事業部向け",
  version: "1.0.0",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  features: {
    attendance: true,
    dailyReports: true,
    shiftManagement: true,
    alerts: true,
    accessLogs: true,
  },
} as const;
