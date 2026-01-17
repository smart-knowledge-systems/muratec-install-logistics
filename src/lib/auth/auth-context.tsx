"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface User {
  _id: string;
  email: string;
  name?: string;
  role: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "auth_email";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const user = useQuery(api.users.getByEmail, email ? { email } : "skip") as
    | User
    | null
    | undefined;

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      setEmail(stored);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (loginEmail: string, name?: string) => {
      setIsLoading(true);
      try {
        await getOrCreateUser({ email: loginEmail, name });
        localStorage.setItem(AUTH_STORAGE_KEY, loginEmail);
        setEmail(loginEmail);
      } finally {
        setIsLoading(false);
      }
    },
    [getOrCreateUser],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setEmail(null);
  }, []);

  const value: AuthContextType = {
    user: user ?? null,
    isLoading: isLoading || (email !== null && user === undefined),
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
