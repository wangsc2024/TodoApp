import styled from "@emotion/styled";
import {
  AccessTimeRounded,
  DevicesRounded,
  QrCodeRounded,
  QrCodeScannerRounded,
  RestartAltRounded,
  SyncProblemRounded,
  WifiOffRounded,
  WifiTetheringRounded,
} from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { TopBar } from "../components";
import QRCodeScannerDialog from "../components/QRCodeScannerDialog";
import { UserContext } from "../contexts/UserContext";
import { useResponsiveDisplay } from "../hooks/useResponsiveDisplay";
import { usePeerSync } from "../hooks/usePeerSync";
import type { OtherDataSyncOption, SyncStatus } from "../types/sync";
import { getFontColor, showToast, timeAgo } from "../utils";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import DisabledThemeProvider from "../contexts/DisabledThemeProvider";

export default function Sync() {
  const { user } = useContext(UserContext);

  const isMobile = useResponsiveDisplay();
  const isOnline = useOnlineStatus();
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const {
    mode,
    setMode,
    hostPeerId,
    syncStatus,
    startHost,
    connectToHost,
    otherDataSyncOption,
    setOtherDataSyncOption,
    otherDataSource,
    resetAll,
  } = usePeerSync();

  const otherDataSyncOptionRef = useRef(otherDataSyncOption);

  useEffect(() => {
    otherDataSyncOptionRef.current = otherDataSyncOption;
  }, [otherDataSyncOption]);

  useEffect(() => {
    document.title = "Todo App - Sync Data";
  }, []);

  const handleScan = (text: string | null) => {
    if (!text) return;
    setScannerOpen(false);
    try {
      const scannedId = text.trim();
      setMode("scan");
      connectToHost(scannedId);
    } catch (err) {
      showToast("掃描 QR Code 失敗", { type: "error" });
      console.error("Error scanning QR Code:", err);
    }
  };

  const getOtherDataSourceLabel = (src: OtherDataSyncOption | null) => {
    if (!src) return null;

    if (src === "this_device") {
      return mode === "display" ? "本裝置" : "主機裝置";
    }

    if (src === "other_device") {
      return mode === "display" ? "其他裝置" : "本裝置";
    }

    return null;
  };

  return (
    <>
      <TopBar title="同步資料" />
      <MainContainer>
        {!mode && (
          <>
            <FeatureDescription>
              <DevicesRounded sx={{ fontSize: 40, color: (theme) => theme.palette.primary.main }} />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                在裝置間同步資料
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                透過點對點連線，只需掃描一次 QR Code，即可在裝置間安全傳輸您的任務、分類及其他資料。
                資料不會儲存或處理於外部伺服器。
              </Typography>
              {user.lastSyncedAt && (
                <Tooltip
                  title={new Intl.DateTimeFormat(navigator.language, {
                    dateStyle: "long",
                    timeStyle: "medium",
                  }).format(new Date(user.lastSyncedAt))}
                  placement="top"
                >
                  <LastSyncedText>
                    <AccessTimeRounded /> &nbsp; 上次同步於 {timeAgo(new Date(user.lastSyncedAt))}
                  </LastSyncedText>
                </Tooltip>
              )}
              {!isOnline && (
                <Alert icon={<WifiOffRounded />} severity="error" sx={{ textAlign: "left", mt: 4 }}>
                  <AlertTitle>離線</AlertTitle>
                  您目前處於離線狀態。兩部裝置都必須在線上才能開始點對點同步。
                </Alert>
              )}
            </FeatureDescription>
            <ModeSelectionContainer>
              <DisabledThemeProvider>
                <SyncButton
                  variant="contained"
                  disabled={!isOnline}
                  onClick={() => {
                    setOtherDataSyncOption("this_device");
                    setMode("display");
                    startHost();
                  }}
                  startIcon={<QrCodeRounded />}
                >
                  顯示 QR Code
                </SyncButton>
                <SyncButton
                  variant="outlined"
                  disabled={!isOnline}
                  onClick={() => {
                    setScannerOpen(true);
                  }}
                  startIcon={<QrCodeScannerRounded />}
                >
                  掃描 QR Code
                </SyncButton>
              </DisabledThemeProvider>
            </ModeSelectionContainer>
          </>
        )}

        {mode === "display" && (
          <StyledPaper>
            <ModeHeader>
              <WifiTetheringRounded /> 主機模式
            </ModeHeader>
            {hostPeerId ? (
              isSeverity(syncStatus.severity, "success") ? (
                <SyncSuccessScreen
                  syncStatus={syncStatus}
                  otherDataSource={otherDataSource}
                  getOtherDataSourceLabel={getOtherDataSourceLabel}
                  resetAll={resetAll}
                />
              ) : (
                <Stack spacing={2} alignItems="center">
                  <QRCode
                    value={hostPeerId}
                    size={300}
                    style={{ backgroundColor: "white", borderRadius: "8px", padding: "8px" }}
                  />
                  <QRCodeLabel>使用其他裝置掃描此 QR Code 以同步資料</QRCodeLabel>
                  <FormControl>
                    <StyledFormLabel id="sync-radio-buttons-group-label">
                      同步應用設定及其他資料
                    </StyledFormLabel>
                    <RadioGroup
                      row={!isMobile}
                      aria-labelledby="sync-radio-buttons-group-label"
                      name="row-radio-buttons-group"
                      value={otherDataSyncOption}
                      onChange={(e) =>
                        setOtherDataSyncOption(e.target.value as OtherDataSyncOption)
                      }
                    >
                      <StyledFormControlLabel
                        value="this_device"
                        control={<Radio />}
                        label="本裝置"
                      />
                      <StyledFormControlLabel
                        value="other_device"
                        control={<Radio />}
                        label="其他裝置"
                      />
                      <StyledFormControlLabel value="no_sync" control={<Radio />} label="不同步" />
                    </RadioGroup>
                  </FormControl>
                  <Typography
                    sx={{
                      opacity: 0.8,
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#000000"),
                    }}
                  >
                    任務和分類將自動同步。
                  </Typography>
                  <SyncStatusAlert syncStatus={syncStatus} />
                  <SyncButton
                    variant="outlined"
                    onClick={resetAll}
                    color={isSeverity(syncStatus.severity, "error") ? "error" : "primary"}
                  >
                    {isSeverity(syncStatus.severity, "error") ? (
                      "重試"
                    ) : (
                      <>
                        <RestartAltRounded /> &nbsp; 重置
                      </>
                    )}
                  </SyncButton>
                </Stack>
              )
            ) : (
              <LoadingContainer>
                <CircularProgress size={24} />
                <LoadingText>初始化中...</LoadingText>
              </LoadingContainer>
            )}
          </StyledPaper>
        )}

        {mode === "scan" && (
          <StyledPaper>
            <ModeHeader>
              <QrCodeScannerRounded /> 掃描模式
            </ModeHeader>
            {isSeverity(syncStatus.severity, "success") ? (
              <SyncSuccessScreen
                syncStatus={syncStatus}
                otherDataSource={otherDataSource}
                getOtherDataSourceLabel={getOtherDataSourceLabel}
                resetAll={resetAll}
              />
            ) : (
              <Stack spacing={2} alignItems="center">
                <SyncStatusAlert syncStatus={syncStatus} />
                {(syncStatus.message === "Connecting to host..." ||
                  syncStatus.message === "Connected, sending your data...") && (
                  <LoadingContainer>
                    <CircularProgress size={24} />
                    <LoadingText>{syncStatus.message}</LoadingText>
                  </LoadingContainer>
                )}
                <SyncButton
                  variant="outlined"
                  onClick={resetAll}
                  color={isSeverity(syncStatus.severity, "error") ? "error" : "primary"}
                >
                  {isSeverity(syncStatus.severity, "error") ? (
                    "重試"
                  ) : (
                    <>
                      <RestartAltRounded /> &nbsp; 重置
                    </>
                  )}
                </SyncButton>
              </Stack>
            )}
          </StyledPaper>
        )}

        <QRCodeScannerDialog
          subTitle="掃描 QR Code 以同步。"
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(result) => {
            if (result && result[0]?.rawValue) handleScan(result[0].rawValue);
          }}
          onError={(err) => {
            console.error("QR scan error:", err);
            showToast("掃描 QR Code 時發生錯誤。", { type: "error" });
            setScannerOpen(false);
          }}
        />
      </MainContainer>
    </>
  );
}
export function SyncSuccessScreen({
  syncStatus,
  otherDataSource,
  getOtherDataSourceLabel,
  resetAll,
}: {
  syncStatus: SyncStatus;
  otherDataSource: OtherDataSyncOption | null;
  getOtherDataSourceLabel: (src: OtherDataSyncOption | null) => string | null;
  resetAll: () => void;
}) {
  return (
    <Stack spacing={2} alignItems="center">
      <StyledAlert severity={syncStatus.severity} icon={undefined}>
        <b>同步完成</b>
        <div>{syncStatus.message || "閒置"}</div>
      </StyledAlert>
      {otherDataSource && (
        <Typography
          sx={{
            fontSize: 12,
            opacity: 0.8,
            color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#000000"),
          }}
        >
          設定及其他資料{" "}
          {otherDataSource === "no_sync" ? (
            "未進行同步。"
          ) : (
            <>
              已從 <b>{getOtherDataSourceLabel(otherDataSource)}</b> 匯入。
            </>
          )}
        </Typography>
      )}
      <SyncButton
        variant="outlined"
        onClick={resetAll}
        color={syncStatus.severity === "success" ? "success" : "primary"}
      >
        完成
      </SyncButton>
    </Stack>
  );
}

function SyncStatusAlert({ syncStatus }: { syncStatus: SyncStatus }) {
  return (
    <StyledAlert
      severity={syncStatus.severity}
      //@ts-expect-error it works
      color={isSeverity(syncStatus.severity, "info") ? "primary" : undefined}
      icon={
        syncStatus.severity === "error" || syncStatus.severity === "warning" ? (
          <SyncProblemRounded />
        ) : undefined
      }
    >
      <AlertTitle>
        {syncStatus.severity === "error"
          ? "錯誤"
          : syncStatus.severity === "warning"
            ? "警告"
            : "狀態"}
      </AlertTitle>
      {syncStatus.message || "閒置"}
    </StyledAlert>
  );
}

function isSeverity<T extends SyncStatus["severity"]>(
  sev: SyncStatus["severity"],
  value: T,
): sev is T {
  return sev === value;
}

const MainContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 20px;
  max-width: 600px !important;
`;

const FeatureDescription = styled.div`
  text-align: center;
  margin-bottom: 16px;
`;

const ModeHeader = styled.h5`
  color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
  font-weight: 600;
  font-size: 1.4rem;
  text-align: center;
  margin: 0;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const LastSyncedText = styled(Typography)`
  color: ${({ theme }) => getFontColor(theme.secondary)};
  opacity: 0.9;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModeSelectionContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
`;

const StyledPaper = styled.div`
  padding: 24px;
  border-radius: 24px;
  background: ${({ theme }) => (theme.darkmode ? "#1f1f1f" : "#ffffff")};
  width: 100%;
  text-align: center;
`;

const QRCodeLabel = styled(Typography)`
  font-weight: 600;
  max-width: 310px;
  margin: 0;
  color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 20px 0;
`;

const SyncButton = styled(Button)`
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  min-width: 180px;
`;

const StyledAlert = styled(Alert)`
  width: 100%;
  max-width: 400px;
  text-align: left;
  & .MuiAlert-message {
    width: 100%;
  }
  @media (max-width: 768px) {
    max-width: 350px;
  }
`;

const LoadingText = styled(Typography)`
  color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
`;

const StyledFormLabel = styled(FormLabel)`
  color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
  opacity: 0.8;
  &.Mui-focused {
    color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
  }
`;

const StyledFormControlLabel = styled(FormControlLabel)`
  color: ${({ theme }) => (theme.darkmode ? "#ffffff" : "#000000")};
`;
