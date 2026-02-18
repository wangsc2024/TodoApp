import { Dialog, DialogActions, DialogContent, TextField } from "@mui/material";
import { CustomDialogTitle } from "./DialogTitle";
import { DialogBtn } from "../styles";
import { EmailRounded } from "@mui/icons-material";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordDialog({ open, onClose }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const success = await resetPassword(email.trim());
    setLoading(false);
    if (success) {
      setEmail("");
      onClose();
    }
  };

  const handleClose = () => {
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <CustomDialogTitle
        title="重設密碼"
        subTitle="輸入您的電子郵件以接收密碼重設連結"
        onClose={handleClose}
        icon={<EmailRounded />}
      />
      <DialogContent>
        <TextField
          label="電子郵件"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          fullWidth
          autoFocus
          autoComplete="email"
          sx={{ mt: "8px" }}
        />
      </DialogContent>
      <DialogActions>
        <DialogBtn onClick={handleClose}>取消</DialogBtn>
        <DialogBtn onClick={handleSubmit} disabled={!email.trim() || loading}>
          <EmailRounded /> &nbsp; 寄送重設郵件
        </DialogBtn>
      </DialogActions>
    </Dialog>
  );
}
