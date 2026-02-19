import { Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { CustomDialogTitle } from "./DialogTitle";
import { DialogBtn } from "../styles";
import { DeleteForeverRounded } from "@mui/icons-material";
import { useContext, useState } from "react";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../hooks/useAuth";
import { defaultUser } from "../constants/defaultUser";
import { deleteProfilePictureFromDB } from "../utils";
import { clearIndexedDbPersistence, terminate } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

interface DeleteAccountDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ open, onClose }: DeleteAccountDialogProps) {
  const { setUser } = useContext(UserContext);
  const { deleteAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const n = useNavigate();

  const handleDelete = async () => {
    setLoading(true);
    const success = await deleteAccount();
    if (success) {
      try {
        await terminate(db);
        await clearIndexedDbPersistence(db);
      } catch {
        // Ignore cache clearing errors
      }
      setUser(defaultUser);
      await deleteProfilePictureFromDB();
      onClose();
      n("/");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <CustomDialogTitle title="刪除帳號" onClose={onClose} icon={<DeleteForeverRounded />} />
      <DialogContent>
        <Typography sx={{ mb: 1 }}>確定要永久刪除您的帳號嗎？</Typography>
        <Typography variant="body2" color="error">
          此操作無法復原。您的所有雲端任務、分類和設定將被永久刪除。
        </Typography>
      </DialogContent>
      <DialogActions>
        <DialogBtn onClick={onClose}>取消</DialogBtn>
        <DialogBtn onClick={handleDelete} color="error" disabled={loading}>
          <DeleteForeverRounded /> &nbsp; {loading ? "刪除中..." : "永久刪除"}
        </DialogBtn>
      </DialogActions>
    </Dialog>
  );
}
