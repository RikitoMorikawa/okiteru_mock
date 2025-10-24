"use client";

import { useAuth } from "@/hooks/useAuth";

interface RoleBasedRenderProps {
  allowedRoles: ("manager" | "staff")[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleBasedRender({ allowedRoles, children, fallback = null }: RoleBasedRenderProps) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Convenience components for specific roles
export function ManagerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedRender allowedRoles={["manager"]} fallback={fallback}>
      {children}
    </RoleBasedRender>
  );
}

export function StaffOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <RoleBasedRender allowedRoles={["staff"]} fallback={fallback}>
      {children}
    </RoleBasedRender>
  );
}
