import { useAuthContext } from "@/lib/auth-context";

/**
 * Hook to access authentication state.
 * Uses the global AuthContext provider for consistent state across the app.
 */
export function useAuth() {
  return useAuthContext();
}
