import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from "react";
import { Platform } from "react-native";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

interface AuthContextType {
  user: Auth.User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Auth.User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[AuthContext] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[AuthContext] Web platform: fetching user from API...");
        const apiUser = await Api.getMe();
        console.log("[AuthContext] API user response:", apiUser);

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[AuthContext] Web user set from API:", userInfo);
        } else {
          console.log("[AuthContext] Web: No authenticated user from API");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[AuthContext] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[AuthContext] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing"
      );
      
      if (!sessionToken) {
        console.log("[AuthContext] No session token, checking cached user...");
        // Even without token, check if we have cached user info (from recent OAuth)
        const cachedUser = await Auth.getUserInfo();
        if (cachedUser) {
          console.log("[AuthContext] Found cached user without token, clearing...");
          await Auth.clearUserInfo();
        }
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[AuthContext] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[AuthContext] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[AuthContext] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[AuthContext] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[AuthContext] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[AuthContext] Logout API call failed:", err);
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  // Initial load
  useEffect(() => {
    console.log("[AuthContext] Initial load, platform:", Platform.OS);
    
    if (Platform.OS === "web") {
      fetchUser();
    } else {
      // Native: check for cached user info first for faster initial load
      Auth.getUserInfo().then((cachedUser) => {
        console.log("[AuthContext] Native cached user check:", cachedUser);
        if (cachedUser) {
          // Verify we also have a session token
          Auth.getSessionToken().then((token) => {
            if (token) {
              console.log("[AuthContext] Native: setting cached user immediately");
              setUser(cachedUser);
              setLoading(false);
            } else {
              console.log("[AuthContext] Native: cached user but no token, clearing...");
              Auth.clearUserInfo().then(() => {
                setUser(null);
                setLoading(false);
              });
            }
          });
        } else {
          fetchUser();
        }
      });
    }
  }, [fetchUser]);

  useEffect(() => {
    console.log("[AuthContext] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      refresh: fetchUser,
      logout,
      setUser,
    }),
    [user, loading, error, isAuthenticated, fetchUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
