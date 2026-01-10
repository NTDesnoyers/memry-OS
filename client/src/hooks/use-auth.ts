import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@shared/models/auth";

type FetchUserResult = {
  user: AuthUser | null;
  requiresSubscription: boolean;
};

async function fetchUser(): Promise<FetchUserResult> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return { user: null, requiresSubscription: false };
  }

  // Handle 403 - user authenticated but pending approval
  // Fetch status from dedicated endpoint that works for pending users
  if (response.status === 403) {
    const statusRes = await fetch("/api/auth/status", { credentials: "include" });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      return { user: statusData as AuthUser, requiresSubscription: false };
    }
    return { user: null, requiresSubscription: false };
  }

  // Handle 402 - subscription required (user approved but no active subscription)
  if (response.status === 402) {
    const statusRes = await fetch("/api/auth/status", { credentials: "include" });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      return { user: statusData as AuthUser, requiresSubscription: true };
    }
    return { user: null, requiresSubscription: true };
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const user = await response.json();
  return { user, requiresSubscription: false };
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<FetchUserResult>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 30, // 30 seconds - more responsive to status changes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], { user: null, requiresSubscription: false });
    },
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    requiresSubscription: data?.requiresSubscription ?? false,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
