"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, clearToken, setToken, User } from "./api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate an existing token on load.
    api
      .me()
      .then((u) => setUserState(u))
      .catch(() => setUserState(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user } = await api.login(email, password);
    if (user.is_admin) {
      throw new Error("Admin accounts use the admin portal, not this app.");
    }
    setToken(access_token);
    setUserState(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
    if (typeof window !== "undefined") location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, setUser: setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
