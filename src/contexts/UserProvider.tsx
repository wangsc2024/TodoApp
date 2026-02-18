import { useContext } from "react";
import { defaultUser } from "../constants/defaultUser";
import { useStorageState } from "../hooks/useStorageState";
import { useFirestoreSync } from "../hooks/useFirestoreSync";
import { User } from "../types/user";
import { UserContext } from "./UserContext";
import { AuthContext } from "./AuthContext";

export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useStorageState<User>(defaultUser, "user");
  const { firebaseUser } = useContext(AuthContext);

  // Attach Firestore sync when authenticated
  useFirestoreSync(firebaseUser, user, setUser);

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
};
