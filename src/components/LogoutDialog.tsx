import { Dialog, DialogActions, DialogContent } from "@mui/material";
import { CustomDialogTitle } from "./DialogTitle";
import { DialogBtn } from "../styles";
import { Logout } from "@mui/icons-material";
import { useContext } from "react";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../hooks/useAuth";
import { defaultUser } from "../constants/defaultUser";
import { deleteProfilePictureFromDB, showToast } from "../utils";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { db } from "../services/firebase";

interface LogoutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function LogoutDialog({ open, onClose }: LogoutDialogProps) {
  const { setUser } = useContext(UserContext);
  const { isAuthenticated, logout: firebaseLogout } = useAuth();

  const handleLogout = async () => {
    if (isAuthenticated) {
      await firebaseLogout();
      // Clear Firestore persistent cache to prevent data leaking to guest sessions
      try {
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch {
        // Ignore if cache clearing fails (e.g., multiple tabs open)
      }
    }
    setUser(defaultUser);
    onClose();
    await deleteProfilePictureFromDB();
    showToast("已成功登出");
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <CustomDialogTitle title="登出確認" onClose={onClose} icon={<Logout />} />
      <DialogContent>
        {isAuthenticated ? (
          <>確定要登出嗎？您的任務將保留在雲端。</>
        ) : (
          <>
            確定要登出嗎？<b>您的任務將不會被儲存。</b>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <DialogBtn onClick={onClose}>取消</DialogBtn>
        <DialogBtn onClick={handleLogout} color="error">
          <Logout /> &nbsp; 登出
        </DialogBtn>
      </DialogActions>
    </Dialog>
  );
}
