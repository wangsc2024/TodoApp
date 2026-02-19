import { useContext, useMemo, lazy, Suspense, useEffect } from "react";
import {
  AddButton,
  GreetingHeader,
  Offline,
  ProgressPercentageContainer,
  StyledProgress,
  TaskCompletionText,
  TaskCountClose,
  TaskCountHeader,
  TaskCountTextContainer,
  TasksCount,
  TasksCountContainer,
} from "../styles";

import { Emoji } from "emoji-picker-react";
import { Box, Button, CircularProgress, Tooltip, Typography } from "@mui/material";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { AddRounded, CloseRounded, TodayRounded, UndoRounded, WifiOff } from "@mui/icons-material";
import { UserContext } from "../contexts/UserContext";
import { useResponsiveDisplay } from "../hooks/useResponsiveDisplay";
import { useNavigate } from "react-router-dom";
import { AnimatedGreeting } from "../components/AnimatedGreeting";
import { showToast } from "../utils";

const TasksList = lazy(() =>
  import("../components/tasks/TasksList").then((module) => ({ default: module.TasksList })),
);

const Home = () => {
  const { user, setUser } = useContext(UserContext);
  const { tasks, emojisStyle, settings, name } = user;

  const isOnline = useOnlineStatus();
  const n = useNavigate();
  const isMobile = useResponsiveDisplay();

  useEffect(() => {
    document.title = "Todo App";
  }, []);

  // Calculate these values only when tasks change
  const taskStats = useMemo(() => {
    const completedCount = tasks.filter((task) => task.done).length;
    const completedPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    const today = new Date().setHours(0, 0, 0, 0);
    const dueTodayTasks = tasks.filter((task) => {
      if (task.deadline) {
        const taskDeadline = new Date(task.deadline).setHours(0, 0, 0, 0);
        return taskDeadline === today && !task.done;
      }
      return false;
    });

    const taskNamesDueToday = dueTodayTasks.map((task) => task.name);

    return {
      completedTasksCount: completedCount,
      completedTaskPercentage: completedPercentage,
      tasksWithDeadlineTodayCount: dueTodayTasks.length,
      tasksDueTodayNames: taskNamesDueToday,
    };
  }, [tasks]);

  // Memoize time-based greeting
  const timeGreeting = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12 && currentHour >= 5) {
      return "早安";
    } else if (currentHour < 18 && currentHour > 12) {
      return "午安";
    } else {
      return "晚安";
    }
  }, []);

  // Memoize task completion text
  const taskCompletionText = useMemo(() => {
    const percentage = taskStats.completedTaskPercentage;
    switch (true) {
      case percentage === 0:
        return "尚未完成任何任務，繼續加油！";
      case percentage === 100:
        return "恭喜！所有任務已完成！";
      case percentage >= 75:
        return "快完成了！";
      case percentage >= 50:
        return "已經完成一半了！繼續加油！";
      case percentage >= 25:
        return "進展順利。";
      default:
        return "才剛開始而已。";
    }
  }, [taskStats.completedTaskPercentage]);

  const updateShowProgressBar = (value: boolean) => {
    setUser((prevUser) => ({
      ...prevUser,
      settings: {
        ...prevUser.settings,
        showProgressBar: value,
      },
    }));
  };

  return (
    <>
      <GreetingHeader>
        <Emoji unified="1f44b" emojiStyle={emojisStyle} /> &nbsp; {timeGreeting}
        {name && (
          <span translate="no">
            , <span>{name}</span>
          </span>
        )}
      </GreetingHeader>

      <AnimatedGreeting />

      {!isOnline && (
        <Offline>
          <WifiOff /> 您目前處於離線狀態，但仍可使用此應用程式！
        </Offline>
      )}
      {tasks.length > 0 && settings.showProgressBar && (
        <TasksCountContainer>
          <TasksCount glow={settings.enableGlow}>
            <TaskCountClose
              size="small"
              onClick={() => {
                updateShowProgressBar(false);
                showToast(
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    進度條已隱藏。您可以在設定中重新啟用。
                    <Button
                      variant="contained"
                      sx={{ p: "12px 32px" }}
                      onClick={() => updateShowProgressBar(true)}
                      startIcon={<UndoRounded />}
                    >
                      復原
                    </Button>
                  </span>,
                );
              }}
            >
              <CloseRounded />
            </TaskCountClose>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <StyledProgress
                variant="determinate"
                value={taskStats.completedTaskPercentage}
                size={64}
                thickness={5}
                aria-label="進度"
                glow={settings.enableGlow}
              />

              <ProgressPercentageContainer
                glow={settings.enableGlow && taskStats.completedTaskPercentage > 0}
              >
                <Typography
                  variant="caption"
                  component="div"
                  color="white"
                  sx={{ fontSize: "16px", fontWeight: 600 }}
                >{`${Math.round(taskStats.completedTaskPercentage)}%`}</Typography>
              </ProgressPercentageContainer>
            </Box>
            <TaskCountTextContainer>
              <TaskCountHeader>
                {taskStats.completedTasksCount === 0
                  ? `您有 ${tasks.length} 個任務待完成。`
                  : `您已完成 ${tasks.length} 個任務中的 ${taskStats.completedTasksCount} 個。`}
              </TaskCountHeader>
              <TaskCompletionText>{taskCompletionText}</TaskCompletionText>
              {taskStats.tasksWithDeadlineTodayCount > 0 && (
                <span
                  style={{
                    opacity: 0.8,
                    display: "inline-block",
                  }}
                >
                  <TodayRounded sx={{ fontSize: "20px", verticalAlign: "middle" }} />
                  &nbsp;今日到期任務：&nbsp;
                  <span translate="no">
                    {new Intl.ListFormat("zh-TW", { style: "long" }).format(
                      taskStats.tasksDueTodayNames,
                    )}
                  </span>
                </span>
              )}
            </TaskCountTextContainer>
          </TasksCount>
        </TasksCountContainer>
      )}
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        }
      >
        <TasksList />
      </Suspense>
      {!isMobile && (
        <Tooltip title={tasks.length > 0 ? "新增任務" : "新增任務"} placement="left">
          <AddButton
            animate={tasks.length === 0}
            glow={settings.enableGlow}
            onClick={() => n("add")}
            aria-label="新增任務"
          >
            <AddRounded style={{ fontSize: "44px" }} />
          </AddButton>
        </Tooltip>
      )}
    </>
  );
};

export default Home;
