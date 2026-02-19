import { useContext, useEffect, useState } from "react";
import { CustomDialogTitle, TopBar } from "../components";
import {
  DialogBtn,
  ManagementButton,
  ManagementButtonsContainer,
  ManagementContainer,
  ManagementHeader,
  TaskManagementContainer,
} from "../styles";
import { UserContext } from "../contexts/UserContext";
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Tooltip,
  Typography,
} from "@mui/material";
import { Emoji } from "emoji-picker-react";
import { Task, UUID } from "../types/user";
import { useStorageState } from "../hooks/useStorageState";
import { DeleteForeverRounded, DeleteSweepRounded, DoneAllRounded } from "@mui/icons-material";
import { showToast } from "../utils";

const Purge = () => {
  const { user, setUser } = useContext(UserContext);
  const { tasks } = user;

  const [selectedTasks, setSelectedTasks] = useStorageState<UUID[]>(
    [],
    "tasksToPurge",
    "sessionStorage",
  ); // Array of selected task IDs

  const [deleteAllDialog, setDeleteAllDialog] = useState<boolean>(false);

  useEffect(() => {
    document.title = "Todo App - Purge tasks";
  }, []);

  const doneTasks = tasks.filter((task) => task.done);
  const notDoneTasks = tasks.filter((task) => !task.done);

  const selectedNamesList = new Intl.ListFormat("zh-TW", {
    style: "long",
    type: "conjunction",
  }).format(
    selectedTasks.map((taskId) => {
      const selectedTask = user.tasks.find((task) => task.id === taskId);
      return selectedTask ? selectedTask.name : "";
    }),
  );

  const handleTaskClick = (taskId: UUID) => {
    setSelectedTasks((prevSelectedTasks) => {
      if (prevSelectedTasks.includes(taskId)) {
        return prevSelectedTasks.filter((id) => id !== taskId);
      } else {
        return [...prevSelectedTasks, taskId];
      }
    });
  };

  const purgeTasks = (tasks: Task[]) => {
    const updatedTasks = user.tasks.filter(
      (task) => !tasks.some((purgeTask) => purgeTask === task),
    );

    const purgedTaskIds = tasks.map((task) => task.id);

    setSelectedTasks([]);
    setUser((prevUser) => ({
      ...prevUser,
      tasks: updatedTasks,
      deletedTasks: [
        ...(prevUser.deletedTasks || []),
        ...purgedTaskIds.filter((id) => !prevUser.deletedTasks?.includes(id)),
      ],
    }));
  };

  const handlePurgeSelected = () => {
    const tasksToPurge = tasks.filter((task: Task) => selectedTasks.includes(task.id));
    purgeTasks(tasksToPurge);
    showToast(
      <div>
        已清除所選任務：<b translate="no">{selectedNamesList}</b>
      </div>,
    );
  };

  const handlePurgeDone = () => {
    purgeTasks(doneTasks);
    showToast("已清除所有已完成的任務。");
  };

  const handlePurgeAll = () => {
    setDeleteAllDialog(true);
  };

  const renderTasks = (tasks: Task[], title: string) => {
    return (
      <>
        <Divider sx={{ fontWeight: 500, my: "4px" }}>{title}</Divider>
        {tasks.map((task) => (
          <TaskManagementContainer
            key={task.id}
            backgroundClr={task.color}
            onClick={() => handleTaskClick(task.id)}
            selected={selectedTasks.includes(task.id)}
            translate="no"
          >
            <Checkbox size="medium" checked={selectedTasks.includes(task.id)} />
            <Typography
              variant="body1"
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                wordBreak: "break-word",
              }}
            >
              <Emoji size={24} unified={task.emoji || ""} emojiStyle={user.emojisStyle} />{" "}
              {task.name}
            </Typography>
          </TaskManagementContainer>
        ))}
      </>
    );
  };

  return (
    <>
      <TopBar title="清除任務" />
      <ManagementHeader>選擇要清除的任務</ManagementHeader>
      <ManagementContainer>
        {doneTasks.length > 0 && renderTasks(doneTasks, "已完成的任務")}
        {notDoneTasks.length > 0 && renderTasks(notDoneTasks, "未完成的任務")}
        {tasks.length === 0 && (
          <h3 style={{ opacity: 0.8, fontStyle: "italic" }}>您沒有任何可清除的任務</h3>
        )}
      </ManagementContainer>
      <ManagementButtonsContainer>
        <Tooltip
          title={
            selectedTasks.length > 0 ? (
              <div>
                <span>已選擇的任務：</span>
                <span translate="no">{selectedNamesList}</span>
              </div>
            ) : undefined
          }
        >
          <ManagementButton onClick={handlePurgeSelected} disabled={selectedTasks.length === 0}>
            <DeleteSweepRounded /> &nbsp; 清除所選{" "}
            {selectedTasks.length > 0 && `[${selectedTasks.length}]`}
          </ManagementButton>
        </Tooltip>
        <ManagementButton onClick={handlePurgeDone} disabled={doneTasks.length === 0}>
          <DoneAllRounded /> &nbsp; 清除已完成
        </ManagementButton>
        <ManagementButton color="error" onClick={handlePurgeAll} disabled={tasks.length === 0}>
          <DeleteForeverRounded /> &nbsp; 清除所有任務
        </ManagementButton>
      </ManagementButtonsContainer>
      <Dialog open={deleteAllDialog} onClose={() => setDeleteAllDialog(false)}>
        <CustomDialogTitle
          title="清除所有任務"
          subTitle="確認您要清除所有任務"
          onClose={() => setDeleteAllDialog(false)}
          icon={<DeleteForeverRounded />}
        />
        <DialogContent>此操作無法復原。您確定要繼續嗎？</DialogContent>
        <DialogActions>
          <DialogBtn onClick={() => setDeleteAllDialog(false)}>取消</DialogBtn>
          <DialogBtn
            color="error"
            onClick={() => {
              purgeTasks(tasks);
              setDeleteAllDialog(false);
              showToast("已清除所有任務");
            }}
          >
            <DeleteForeverRounded /> &nbsp; 清除
          </DialogBtn>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Purge;
