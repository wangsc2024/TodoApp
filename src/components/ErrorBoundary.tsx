import styled from "@emotion/styled";
import {
  DataObjectRounded,
  DeleteForeverRounded,
  DescriptionRounded,
  ErrorOutlineRounded,
  ExpandMoreRounded,
  FileDownload,
  RefreshRounded,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from "@mui/material";
import React, { ErrorInfo } from "react";
import { CustomDialogTitle, TaskIcon } from ".";
import { UserContext } from "../contexts/UserContext";
import { DialogBtn, StyledLink } from "../styles";
import { exportTasksToJson, getFontColor, showToast } from "../utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  openClearDialog: boolean;
}

/**
 * ErrorBoundary component that catches and displays errors.
 */

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = UserContext;
  declare context: React.ContextType<typeof UserContext>;
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      openClearDialog: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: error,
      openClearDialog: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    // This fixes issues with caching where dynamically imported modules fail to load due to changed asset names in new builds.
    if (
      error.message.includes("Failed to fetch dynamically imported") ||
      error.message.includes("is not a valid JavaScript")
    ) {
      showToast("正在重新載入頁面", { type: "loading" });

      const retries = parseInt(sessionStorage.getItem("reload_retries") || "0", 10);

      if (retries < 3) {
        setTimeout(() => {
          sessionStorage.setItem("reload_retries", String(retries + 1));
          location.reload();
        }, 1000);
      }
    }
  }

  handleOpenDialog = () => {
    this.setState({ openClearDialog: true });
  };

  handleCloseDialog = () => {
    this.setState({ openClearDialog: false });
  };

  handleConfirmClearData = () => {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { user } = this.context;
      const { tasks } = user;

      return (
        <Container>
          <ErrorHeader>哎呀！發生錯誤了</ErrorHeader>
          <ErrorIconContainer>
            <TaskIcon scale={0.6} variant="error" />
          </ErrorIconContainer>
          <h3>
            <span style={{ color: "#ff3131", display: "inline-block" }}>
              <ErrorOutlineRounded sx={{ verticalAlign: "middle", mb: "4px" }} /> ERROR:
            </span>{" "}
            <span translate="no">
              [{this.state.error?.name}] {this.state.error?.message}
            </span>
          </h3>
          <h2>
            要修復此問題，請嘗試清除本地檔案（Cookie 和快取），然後重新整理頁面。
            如果問題持續發生，請透過{" "}
            <StyledLink translate="no" href="https://github.com/maciekt07/TodoApp/issues">
              Github Issues
            </StyledLink>
            回報問題。
          </h2>
          <Alert severity="error" variant="filled" sx={{ mt: "-8px", mb: "18px" }}>
            清除應用程式資料後，您將失去所有任務。
          </Alert>
          <div style={{ display: "flex", gap: "12px" }}>
            <StyledButton color="warning" onClick={() => location.reload()}>
              <RefreshRounded /> &nbsp; 重新整理頁面
            </StyledButton>
            <StyledButton color="error" onClick={this.handleOpenDialog}>
              <DeleteForeverRounded /> &nbsp; 自動清除
            </StyledButton>
          </div>

          <ErrorAccordion disableGutters>
            <AccordionSummary expandIcon={<ErrorExpandIcon />}>
              <Typography
                fontWeight={700}
                fontSize={18}
                sx={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <DescriptionRounded /> 錯誤堆疊
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div translate="no" style={{ opacity: 0.8, fontSize: "12px" }}>
                {this.state.error?.stack?.replace(this.state.error?.message, "")}
              </div>
            </AccordionDetails>
          </ErrorAccordion>

          <pre>
            <UserDataLabel>
              <DataObjectRounded /> &nbsp; 使用者資料
            </UserDataLabel>
            <Button
              variant="outlined"
              sx={{ ml: "6px", my: "18px", p: "12px 20px", borderRadius: "14px" }}
              onClick={() => {
                exportTasksToJson(tasks);
                showToast(`已匯出所有任務 (${tasks.length})`);
              }}
            >
              <FileDownload /> &nbsp; 匯出任務為 JSON
            </Button>
            <br />
            <code translate="no">{JSON.stringify(user, null, 4)}</code>
          </pre>
          <Dialog open={this.state.openClearDialog} onClose={this.handleCloseDialog}>
            <CustomDialogTitle
              title="清除資料"
              subTitle="此操作無法復原。"
              icon={<DeleteForeverRounded />}
              onClose={this.handleCloseDialog}
            />
            <DialogContent>確定要清除所有資料嗎？您將失去所有任務。</DialogContent>
            <DialogActions>
              <DialogBtn onClick={this.handleCloseDialog}>取消</DialogBtn>
              <DialogBtn onClick={this.handleConfirmClearData} color="error">
                確認
              </DialogBtn>
            </DialogActions>
          </Dialog>
        </Container>
      );
    }

    return this.props.children;
  }
}

const Container = styled.div`
  margin: 0 8vw;
  @media (max-width: 768px) {
    margin: 0;
  }
`;

const ErrorIconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
`;

const ErrorHeader = styled.h1`
  margin-top: 32px;
  margin-bottom: 32px;
  font-size: 36px;
  color: #ff3131;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (max-width: 768px) {
    text-align: left;
    justify-content: left;
    font-size: 30px;
    margin-top: 0;
    margin-bottom: 0;
  }
`;

const ErrorAccordion = styled(Accordion)`
  color: ${({ theme }) => getFontColor(theme.secondary)};
  border-radius: 14px !important;
  background: ${({ theme }) => getFontColor(theme.secondary)}18;
  box-shadow: none;
  padding: 4px;
  margin-bottom: 18px;
  margin-top: 18px;
`;

const ErrorExpandIcon = styled(ExpandMoreRounded)`
  color: ${({ theme }) => getFontColor(theme.secondary)};
  font-size: 32px;
`;

const UnstyledButton = ({ ...props }: ButtonProps) => (
  <Button variant="outlined" size="large" {...props} />
);

const StyledButton = styled(UnstyledButton)`
  padding: 10px 30px;
  border-radius: 12px;
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const UserDataLabel = styled.p`
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px 0;
`;

export default ErrorBoundary;
