import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { Button, CircularProgress, Tab, Tabs, TextField } from "@mui/material";
import { LoginRounded, PersonAddRounded, PersonOutlineRounded } from "@mui/icons-material";
import { TopBar } from "../components";
import { ForgotPasswordDialog } from "../components/ForgotPasswordDialog";
import { useAuth } from "../hooks/useAuth";
import { getFontColor } from "../utils";
import { ColorPalette } from "../theme/themeConfig";
import { USER_NAME_MAX_LENGTH } from "../constants";

const Auth = () => {
  const [tab, setTab] = useState<0 | 1>(0); // 0 = sign in, 1 = sign up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [openForgotPassword, setOpenForgotPassword] = useState(false);

  const { signIn, signUp, isAuthenticated } = useAuth();
  const n = useNavigate();

  useEffect(() => {
    document.title = "Todo App - 登入";
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      n("/");
    }
  }, [isAuthenticated, n]);

  const isSignIn = tab === 0;

  const emailError = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordError = password.length > 0 && password.length < 6;
  const confirmPasswordError =
    !isSignIn && confirmPassword.length > 0 && confirmPassword !== password;
  const displayNameError = displayName.length > USER_NAME_MAX_LENGTH;

  const canSubmit =
    email.trim() &&
    password.length >= 6 &&
    !emailError &&
    !passwordError &&
    (isSignIn || (!confirmPasswordError && confirmPassword === password));

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);

    if (isSignIn) {
      const success = await signIn(email.trim(), password);
      if (success) n("/");
    } else {
      const success = await signUp(email.trim(), password, displayName.trim() || undefined);
      if (success) n("/");
    }

    setLoading(false);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue as 0 | 1);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <>
      <TopBar title={isSignIn ? "登入" : "註冊"} />
      <Container>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ width: "100%", mb: "16px" }}
        >
          <Tab label="登入" icon={<LoginRounded />} iconPosition="start" />
          <Tab label="註冊" icon={<PersonAddRounded />} iconPosition="start" />
        </Tabs>

        {!isSignIn && (
          <StyledTextField
            label="顯示名稱（選填）"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={displayNameError}
            helperText={displayNameError ? `名稱不可超過 ${USER_NAME_MAX_LENGTH} 個字元` : ""}
            autoComplete="name"
          />
        )}

        <StyledTextField
          label="電子郵件"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          helperText={emailError ? "請輸入有效的電子郵件地址" : ""}
          autoComplete="email"
          autoFocus
        />

        <StyledTextField
          label="密碼"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && isSignIn && handleSubmit()}
          error={passwordError}
          helperText={passwordError ? "密碼至少需要 6 個字元" : ""}
          autoComplete={isSignIn ? "current-password" : "new-password"}
        />

        {!isSignIn && (
          <StyledTextField
            label="確認密碼"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            error={confirmPasswordError}
            helperText={confirmPasswordError ? "密碼不一致" : ""}
            autoComplete="new-password"
          />
        )}

        {isSignIn && (
          <ForgotPasswordLink onClick={() => setOpenForgotPassword(true)}>
            忘記密碼？
          </ForgotPasswordLink>
        )}

        <SubmitButton onClick={handleSubmit} disabled={!canSubmit || loading} fullWidth>
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : isSignIn ? (
            <>
              <LoginRounded /> &nbsp; 登入
            </>
          ) : (
            <>
              <PersonAddRounded /> &nbsp; 建立帳號
            </>
          )}
        </SubmitButton>

        <GuestButton onClick={() => n("/")} variant="outlined" fullWidth>
          <PersonOutlineRounded /> &nbsp; 以訪客身份繼續
        </GuestButton>
      </Container>

      <ForgotPasswordDialog
        open={openForgotPassword}
        onClose={() => setOpenForgotPassword(false)}
      />
    </>
  );
};

export default Auth;

const Container = styled.div`
  margin: 0 auto;
  max-width: 400px;
  padding: 48px 32px;
  border-radius: 48px;
  background: ${({ theme }) => (theme.darkmode ? "#383838" : "#f5f5f5")};
  color: ${({ theme }) => (theme.darkmode ? ColorPalette.fontLight : ColorPalette.fontDark)};
  transition:
    border 0.3s,
    box-shadow 0.3s;
  border: 4px solid ${({ theme }) => theme.primary};
  display: flex;
  gap: 14px;
  flex-direction: column;
  align-items: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledTextField = styled(TextField)`
  width: 100%;
  & .MuiOutlinedInput-root {
    border-radius: 16px;
  }
`;

const SubmitButton = styled(Button)`
  font-weight: 600;
  border: none;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => getFontColor(theme.primary)};
  font-size: 18px;
  padding: 14px;
  border-radius: 16px;
  cursor: pointer;
  text-transform: none;
  margin-top: 4px;
  transition:
    background 0.3s,
    color 0.3s;
  &:hover {
    background: ${({ theme }) => theme.primary};
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    color: white;
  }
`;

const GuestButton = styled(Button)`
  font-size: 16px;
  padding: 12px;
  border-radius: 16px;
  text-transform: none;
`;

const ForgotPasswordLink = styled.span`
  color: ${({ theme }) => theme.primary};
  cursor: pointer;
  font-size: 14px;
  align-self: flex-end;
  margin-top: -8px;
  &:hover {
    text-decoration: underline;
  }
`;
