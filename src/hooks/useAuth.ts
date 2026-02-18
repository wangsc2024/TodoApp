import { useContext, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { AuthContext, type AuthContextType } from "../contexts/AuthContext";
import { showToast } from "../utils";

interface UseAuthReturn extends AuthContextType {
  signUp: (email: string, password: string, displayName?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}

function mapFirebaseError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "此電子郵件已被註冊。";
    case "auth/invalid-email":
      return "無效的電子郵件地址。";
    case "auth/weak-password":
      return "密碼至少需要 6 個字元。";
    case "auth/user-not-found":
      return "找不到此電子郵件的帳號。";
    case "auth/wrong-password":
      return "密碼錯誤。";
    case "auth/invalid-credential":
      return "電子郵件或密碼錯誤。";
    case "auth/too-many-requests":
      return "嘗試次數過多，請稍後再試。";
    default:
      return "認證失敗，請再試一次。";
  }
}

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<boolean> => {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
        showToast("帳號建立成功！");
        return true;
      } catch (error: unknown) {
        const message = mapFirebaseError((error as { code: string }).code);
        showToast(message, { type: "error" });
        return false;
      }
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("登入成功！");
      return true;
    } catch (error: unknown) {
      const message = mapFirebaseError((error as { code: string }).code);
      showToast(message, { type: "error" });
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    showToast("已成功登出。");
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("密碼重設郵件已寄出，請查看您的信箱。");
      return true;
    } catch (error: unknown) {
      const message = mapFirebaseError((error as { code: string }).code);
      showToast(message, { type: "error" });
      return false;
    }
  }, []);

  return { ...context, signUp, signIn, logout, resetPassword };
}
