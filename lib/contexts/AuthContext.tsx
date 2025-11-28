"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

// UUID do usuário de teste (do seed data)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

interface AuthContextType {
  userId: string | null;
  setUserId: (userId: string | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função helper para obter userId sincronamente (client-side only)
function getInitialUserId(): string {
  if (typeof window === "undefined") return TEST_USER_ID;
  const storedUserId = localStorage.getItem("userId");
  if (storedUserId) {
    return storedUserId;
  }
  // Usa o usuário de teste por padrão e salva no localStorage
  localStorage.setItem("userId", TEST_USER_ID);
  return TEST_USER_ID;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializa sincronamente com o userId do localStorage ou usuário de teste
  const [userId, setUserIdState] = useState<string | null>(() =>
    getInitialUserId()
  );

  useEffect(() => {
    // Garantir que o userId está salvo no localStorage
    if (userId && userId !== localStorage.getItem("userId")) {
      localStorage.setItem("userId", userId);
    }
  }, [userId]);

  const setUserId = (newUserId: string | null) => {
    setUserIdState(newUserId);
    if (newUserId) {
      localStorage.setItem("userId", newUserId);
    } else {
      localStorage.removeItem("userId");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        setUserId,
        isAuthenticated: !!userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
