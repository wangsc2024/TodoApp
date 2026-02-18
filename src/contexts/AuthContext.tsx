import { createContext } from "react";
import type { User as FirebaseUser } from "firebase/auth";

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  isAuthLoading: true,
  isAuthenticated: false,
});
