import {
  Alert,
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useState } from "react";
import styled from "@emotion/styled";
import {
  AddAPhotoRounded,
  CloudDoneRounded,
  Delete,
  DeleteForeverRounded,
  LinkRounded,
  LoginRounded,
  Logout,
  SaveRounded,
  Settings,
  TodayRounded,
  UploadRounded,
} from "@mui/icons-material";
import { PFP_MAX_SIZE, PROFILE_PICTURE_MAX_LENGTH, USER_NAME_MAX_LENGTH } from "../constants";
import { CustomDialogTitle, LogoutDialog, TopBar } from "../components";
import { DeleteAccountDialog } from "../components/DeleteAccountDialog";
import { DialogBtn, fadeIn, UserAvatar, VisuallyHiddenInput } from "../styles";
import { UserContext } from "../contexts/UserContext";
import { timeAgo, getFontColor, showToast } from "../utils";
import {
  initDB,
  saveProfilePictureInDB,
  deleteProfilePictureFromDB,
  validateImageFile,
  fileToBase64,
  getProfilePictureFromDB,
  optimizeProfilePicture,
  ALLOWED_PFP_TYPES,
} from "../utils/profilePictureStorage";
import { ColorPalette } from "../theme/themeConfig";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

// TODO: move this to settings dialog
const UserProfile = () => {
  const { user, setUser } = useContext(UserContext);
  const { isAuthenticated, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { name, profilePicture, createdAt } = user;
  const [userName, setUserName] = useState<string>("");
  const [profilePictureURL, setProfilePictureURL] = useState<string>("");
  const [openChangeImage, setOpenChangeImage] = useState<boolean>(false);
  const [openLogoutDialog, setOpenLogoutDialog] = useState<boolean>(false);
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState<boolean>(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [showBrokenPfpAlert, setShowBrokenPfpAlert] = useState(false);

  useEffect(() => {
    document.title = `Todo App - User ${name ? `(${name})` : ""}`;
  }, [name]);

  useEffect(() => {
    const loadAvatar = async () => {
      const src = await getProfilePictureFromDB(profilePicture);
      setAvatarSrc(src);
    };

    loadAvatar();
  }, [profilePicture]);

  useEffect(() => {
    setShowBrokenPfpAlert(false);

    const timer = setTimeout(() => {
      setShowBrokenPfpAlert(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [avatarSrc, profilePicture]);

  useEffect(() => {
    // Initialize IndexedDB
    initDB().catch((error) => {
      console.error("Error initializing IndexedDB:", error);
    });
  }, []);

  const handleSaveName = () => {
    if (userName.length <= USER_NAME_MAX_LENGTH && userName !== name) {
      setUser({ ...user, name: userName });
      showToast("已更新使用者名稱");
      setUserName("");
    }
  };

  const handleOpenImageDialog = () => {
    setOpenChangeImage(true);
  };
  const handleCloseImageDialog = () => {
    setOpenChangeImage(false);
    setProfilePictureURL("");
  };

  const handleSaveImageLink = () => {
    if (
      profilePictureURL.length <= PROFILE_PICTURE_MAX_LENGTH &&
      profilePictureURL.startsWith("https://")
    ) {
      if (user.profilePicture && user.profilePicture.startsWith("LOCAL_FILE_")) {
        handleDeleteImage(() => {
          setUser((prevUser) => ({
            ...prevUser,
            profilePicture: profilePictureURL,
          }));
          setProfilePictureURL("");
          handleCloseImageDialog();
          showToast("已透過連結更新頭像。");
        });
      } else {
        setUser((prevUser) => ({
          ...prevUser,
          profilePicture: profilePictureURL,
        }));
        setProfilePictureURL("");
        handleCloseImageDialog();
        showToast("已透過連結更新頭像。");
      }
    } else {
      showToast("無效的頭像網址。", { type: "error" });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      showToast(error, { type: "error" });
      return;
    }

    try {
      const originalSize = file.size;
      // crop image to square first
      const croppedBlob = await optimizeProfilePicture(file);
      const croppedFile = new File([croppedBlob], file.name, { type: croppedBlob.type });

      const base64 = await fileToBase64(croppedFile);
      const newId = await saveProfilePictureInDB(base64);

      setUser((prevUser) => ({
        ...prevUser,
        profilePicture: newId,
      }));

      handleCloseImageDialog();

      const formatBytes = (bytes: number): string => {
        const units = ["byte", "kilobyte", "megabyte"] as const;
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / 1024 ** i;

        return new Intl.NumberFormat(navigator.language, {
          style: "unit",
          unit: units[i],
          maximumFractionDigits: 1,
        }).format(value);
      };

      // calculate actual byte size including the header
      const base64Size = new TextEncoder().encode(base64).length;

      const compressionPercent = Number(((1 - base64Size / originalSize) * 100).toFixed(1));

      showToast(
        compressionPercent > 10 ? (
          <>
            <strong>頭像已上傳。</strong>
            <br />
            已從 <b style={{ whiteSpace: "nowrap" }}>{formatBytes(originalSize)}</b> 壓縮至{" "}
            <b style={{ whiteSpace: "nowrap" }}>{formatBytes(base64Size)}</b>（縮小了{" "}
            {compressionPercent}%）
          </>
        ) : (
          "頭像已上傳。"
        ),
        { duration: 7000 },
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      showToast("上傳頭像失敗。", { type: "error" });
    }
  };

  const handleDeleteImage = async (callback?: () => void) => {
    try {
      await deleteProfilePictureFromDB();
      setUser((prevUser) => ({ ...prevUser, profilePicture: null }));
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      showToast("刪除頭像失敗。", { type: "error" });
    } finally {
      callback?.();
    }
  };

  return (
    <>
      <TopBar title="使用者個人檔案" />
      <Container glow={user.settings.enableGlow}>
        <Tooltip title="應用設定">
          <IconButton
            onClick={() => (window.location.hash = "#settings")}
            aria-label="設定"
            size="large"
            sx={{
              position: "absolute",
              top: "24px",
              right: "24px",
            }}
          >
            <Settings fontSize="large" />
          </IconButton>
        </Tooltip>
        <Tooltip title={profilePicture ? "變更個人頭像" : "新增個人頭像"}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <Avatar
                onClick={handleOpenImageDialog}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenImageDialog();
                  }
                }}
                sx={{
                  background: "#9c9c9c81",
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                }}
              >
                <AddAPhotoRounded />
              </Avatar>
            }
          >
            <UserAvatar
              onClick={handleOpenImageDialog}
              src={avatarSrc || undefined}
              hasimage={profilePicture !== null}
              style={{ cursor: "pointer" }}
              size="96px"
            >
              {name ? name[0].toUpperCase() : undefined}
            </UserAvatar>
          </Badge>
        </Tooltip>
        {showBrokenPfpAlert &&
          (!avatarSrc || !avatarSrc.startsWith("data:")) &&
          profilePicture?.startsWith("LOCAL_FILE") && (
            <BrokenPfpAlert severity="warning" variant="outlined">
              個人頭像可能已損壞。您可以嘗試移除它。
            </BrokenPfpAlert>
          )}
        <UserName translate={name ? "no" : "yes"}>{name || "使用者"}</UserName>
        <Tooltip
          title={new Intl.DateTimeFormat(navigator.language, {
            dateStyle: "full",
            timeStyle: "medium",
          }).format(new Date(createdAt))}
        >
          <CreatedAtDate>
            <TodayRounded fontSize="small" />
            &nbsp;已註冊 {timeAgo(createdAt)}
          </CreatedAtDate>
        </Tooltip>

        {isAuthenticated ? (
          <AuthStatusBadge>
            <CloudDoneRounded fontSize="small" />
            &nbsp;{firebaseUser?.email}
          </AuthStatusBadge>
        ) : (
          <Button
            variant="outlined"
            size="small"
            sx={{ borderRadius: "14px", textTransform: "none" }}
            onClick={() => navigate("/auth")}
          >
            <LoginRounded fontSize="small" />
            &nbsp; 登入以跨裝置同步
          </Button>
        )}

        <TextField
          sx={{ width: "300px", marginTop: "8px" }}
          label={name === null ? "新增名稱" : "變更名稱"}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
          error={userName.length > USER_NAME_MAX_LENGTH || (userName === name && name !== "")}
          helperText={
            userName.length > USER_NAME_MAX_LENGTH
              ? `名稱超過 ${USER_NAME_MAX_LENGTH} 個字元`
              : userName.length > 0 && userName !== name
                ? `${userName.length}/${USER_NAME_MAX_LENGTH}`
                : userName === name && name !== ""
                  ? "新名稱與舊名稱相同。"
                  : ""
          }
          autoComplete="given-name"
        />

        <SaveBtn
          onClick={handleSaveName}
          disabled={userName.length > USER_NAME_MAX_LENGTH || userName === name}
        >
          儲存名稱
        </SaveBtn>
        <Button
          color="error"
          variant="outlined"
          sx={{ p: "12px 20px", borderRadius: "14px", marginTop: "8px" }}
          onClick={() => setOpenLogoutDialog(true)}
        >
          <Logout />
          &nbsp; 登出
        </Button>
        {isAuthenticated && (
          <Button
            color="error"
            variant="text"
            size="small"
            sx={{ borderRadius: "14px", textTransform: "none", opacity: 0.7 }}
            onClick={() => setOpenDeleteAccountDialog(true)}
          >
            <DeleteForeverRounded fontSize="small" />
            &nbsp; 刪除帳號
          </Button>
        )}
      </Container>
      <Dialog open={openChangeImage} onClose={handleCloseImageDialog}>
        <CustomDialogTitle
          title="個人頭像"
          subTitle="變更或刪除個人頭像"
          onClose={handleCloseImageDialog}
          icon={<AddAPhotoRounded />}
        />
        <DialogContent>
          <TextField
            label="頭像連結"
            placeholder="輸入頭像連結..."
            sx={{ my: "8px", width: "100%" }}
            value={profilePictureURL}
            onChange={(e) => {
              setProfilePictureURL(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveImageLink()}
            error={profilePictureURL.length > PROFILE_PICTURE_MAX_LENGTH}
            helperText={
              profilePictureURL.length > PROFILE_PICTURE_MAX_LENGTH
                ? `網址過長，最多 ${PROFILE_PICTURE_MAX_LENGTH} 個字元`
                : ""
            }
            autoComplete="url"
            type="url"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LinkRounded />
                  </InputAdornment>
                ),
              },
            }}
          />

          <StyledDivider>
            <span style={{ opacity: 0.8 }}>或</span>
          </StyledDivider>

          <Button
            component="label"
            variant="contained"
            role={undefined}
            tabIndex={-1}
            fullWidth
            sx={{ my: "8px" }}
          >
            <UploadRounded /> &nbsp; 從檔案上傳
            <VisuallyHiddenInput accept="image/*" type="file" onChange={handleFileUpload} />
          </Button>

          <Typography sx={{ opacity: 0.6, textAlign: "center", fontSize: "14px" }}>
            {ALLOWED_PFP_TYPES.map((type) => type.replace("image/", "").toUpperCase()).join(", ")}{" "}
            以下{" "}
            {new Intl.NumberFormat("zh-TW", {
              style: "unit",
              unit: "megabyte",
              maximumFractionDigits: 2,
            }).format(PFP_MAX_SIZE / (1024 * 1024))}
          </Typography>

          {profilePicture !== null && (
            <>
              <Divider sx={{ my: "12px" }} />
              <Button
                fullWidth
                onClick={() => {
                  handleDeleteImage(() => {
                    setUser((prevUser) => ({ ...prevUser, profilePicture: null }));
                    handleCloseImageDialog();
                    showToast("頭像已移除。");
                  });
                }}
                color="error"
                variant="outlined"
                sx={{ my: "8px" }}
              >
                <Delete /> &nbsp; 移除個人頭像
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <DialogBtn onClick={handleCloseImageDialog}>取消</DialogBtn>
          <DialogBtn
            disabled={
              profilePictureURL.length > PROFILE_PICTURE_MAX_LENGTH ||
              !profilePictureURL.startsWith("https://")
            }
            onClick={handleSaveImageLink}
          >
            <SaveRounded /> &nbsp; 儲存
          </DialogBtn>
        </DialogActions>
      </Dialog>
      <LogoutDialog open={openLogoutDialog} onClose={() => setOpenLogoutDialog(false)} />
      <DeleteAccountDialog
        open={openDeleteAccountDialog}
        onClose={() => setOpenDeleteAccountDialog(false)}
      />
    </>
  );
};

export default UserProfile;

const Container = styled.div<{ glow: boolean }>`
  margin: 0 auto;
  max-width: 400px;
  padding: 64px 38px;
  border-radius: 48px;
  background: ${({ theme }) => (theme.darkmode ? "#383838" : "#f5f5f5")};
  color: ${({ theme }) => (theme.darkmode ? ColorPalette.fontLight : ColorPalette.fontDark)};
  transition:
    border 0.3s,
    box-shadow 0.3s;
  border: 4px solid ${({ theme }) => theme.primary};
  box-shadow: ${({ glow, theme }) => (glow ? `0 0 72px -1px ${theme.primary}bf` : "none")};
  display: flex;
  gap: 14px;
  flex-direction: column;
  align-items: center;
  flex-direction: column;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const SaveBtn = styled(Button)`
  width: 300px;
  font-weight: 600;
  border: none;
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => getFontColor(theme.primary)};
  font-size: 18px;
  padding: 14px;
  border-radius: 16px;
  cursor: pointer;
  text-transform: capitalize;
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

const UserName = styled.span`
  font-size: 20px;
  font-weight: 500;
`;

const CreatedAtDate = styled.span`
  display: flex;
  align-items: center;
  font-style: italic;
  font-weight: 400;
  opacity: 0.8;
  margin-top: -8px;
  margin-bottom: 2px;
  // fix for browser translate
  & font {
    margin: 0 1px;
  }
`;

const AuthStatusBadge = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  opacity: 0.85;
  color: ${({ theme }) => theme.primary};
  margin-top: -4px;
  word-break: break-all;
  text-align: center;
`;

const StyledDivider = styled(Divider)`
  &::before,
  &::after {
    border-color: ${({ theme }) => (theme.darkmode ? "#ffffff83" : "#00000083")};
  }
`;

const BrokenPfpAlert = styled(Alert)`
  margin: 0;
  max-width: 260px;
  font-size: 0.7rem;
  padding: 0 8px;
  align-items: center;
  animation: ${fadeIn} 0.5s ease-in;
`;
