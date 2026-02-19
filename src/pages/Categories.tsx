import { Emoji } from "emoji-picker-react";
import { lazy, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CategoryBadge,
  ColorPicker,
  CustomDialogTitle,
  CustomEmojiPicker,
  TopBar,
} from "../components";
import type { Category, Task, UUID } from "../types/user";
import { useTheme } from "@emotion/react";
import { Delete, DeleteRounded, Edit, ExpandMoreRounded, SaveRounded } from "@mui/icons-material";
import {
  AccordionDetails,
  AccordionSummary,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
import { CATEGORY_NAME_MAX_LENGTH } from "../constants";
import { UserContext } from "../contexts/UserContext";
import { useStorageState } from "../hooks/useStorageState";
import {
  ActionButton,
  AddCategoryButton,
  AddContainer,
  AssociatedTasksAccordion,
  CategoriesContainer,
  CategoryContent,
  CategoryElement,
  CategoryElementsContainer,
  CategoryInput,
  DialogBtn,
  EditNameInput,
  StarChecked,
  StarUnchecked,
} from "../styles";
import { formatDate, generateUUID, getFontColor, showToast, timeAgo } from "../utils";
import { ColorPalette } from "../theme/themeConfig";
import InputThemeProvider from "../contexts/InputThemeProvider";
import { useToasterStore } from "react-hot-toast";
import { TaskContext } from "../contexts/TaskContext";

const DEFAULT_EDIT_CATEGORY_SUBTITLE = "編輯分類的詳細資訊。";

const NotFound = lazy(() => import("./NotFound"));

const Categories = () => {
  const { user, setUser } = useContext(UserContext);
  const { updateCategory } = useContext(TaskContext);
  const theme = useTheme();

  const [name, setName] = useStorageState<string>("", "catName", "sessionStorage");
  const [nameError, setNameError] = useState<string>("");
  const [emoji, setEmoji] = useStorageState<string | null>(null, "catEmoji", "sessionStorage");
  const [color, setColor] = useStorageState<string>(theme.primary, "catColor", "sessionStorage");

  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<UUID | undefined>();

  const [openEditDialog, setOpenEditDialog] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editNameError, setEditNameError] = useState<string>("");
  const [editEmoji, setEditEmoji] = useState<string | null>(null);
  const [editColor, setEditColor] = useState<string>(ColorPalette.purple);
  const [editLastSaveLabel, setEditLastSaveLabel] = useState<string>(
    DEFAULT_EDIT_CATEGORY_SUBTITLE,
  );

  const n = useNavigate();
  const { toasts } = useToasterStore();

  const selectedCategory = user.categories.find((cat) => cat.id === selectedCategoryId);

  useEffect(() => {
    document.title = "Todo App - Categories";
    if (!user.settings.enableCategories) {
      n("/");
    }
    if (name.length > CATEGORY_NAME_MAX_LENGTH) {
      setNameError(`名稱過長（最多 ${CATEGORY_NAME_MAX_LENGTH} 個字元）`);
    }
  }, [n, name.length, user.settings]);

  useEffect(() => {
    const cat = user.categories.find((cat) => cat.id === selectedCategoryId);
    if (cat) {
      setEditColor(cat.color || ColorPalette.purple);
      setEditName(cat.name || "");
      setEditEmoji(cat.emoji || null);
      setEditNameError("");
      setEditLastSaveLabel(
        cat.lastSave
          ? `上次編輯於 ${timeAgo(new Date(cat.lastSave))} • ${formatDate(new Date(cat.lastSave))}`
          : DEFAULT_EDIT_CATEGORY_SUBTITLE,
      );
    }
  }, [selectedCategoryId, user.categories]);

  const handleDelete = (categoryId: UUID | undefined) => {
    if (!categoryId) return;

    const categoryName = user.categories.find((category) => category.id === categoryId)?.name || "";

    const updatedCategories = user.categories.filter((category) => category.id !== categoryId);
    const updatedFavoriteCategories = user.favoriteCategories.filter((id) => id !== categoryId);

    const updatedTasks = user.tasks.map((task) => {
      const updatedCategoryList = task.category?.filter((category) => category.id !== categoryId);
      return {
        ...task,
        category: updatedCategoryList,
      };
    });

    setUser((prevUser) => ({
      ...prevUser,
      categories: updatedCategories,
      favoriteCategories: updatedFavoriteCategories,
      tasks: updatedTasks,
      deletedCategories: [
        ...(prevUser.deletedCategories || []),
        ...(prevUser.deletedCategories?.includes(categoryId) ? [] : [categoryId]),
      ],
    }));

    showToast(
      <div>
        已刪除分類 - <b translate="no">{categoryName}。</b>
      </div>,
    );
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    setName(newName);
    if (newName.length > CATEGORY_NAME_MAX_LENGTH) {
      setNameError(`名稱過長（最多 ${CATEGORY_NAME_MAX_LENGTH} 個字元）`);
    } else {
      setNameError("");
    }
  };

  const handleEditNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newName = event.target.value;
    setEditName(newName);
    if (newName.length > CATEGORY_NAME_MAX_LENGTH) {
      setEditNameError(`名稱過長（最多 ${CATEGORY_NAME_MAX_LENGTH} 個字元）`);
    } else {
      setEditNameError("");
    }
  };

  const handleAddCategory = () => {
    if (name !== "") {
      if (name.length > CATEGORY_NAME_MAX_LENGTH) {
        return;
      }
      const newCategory: Category = {
        id: generateUUID(),
        lastSave: new Date(),
        name,
        emoji: emoji !== "" && emoji !== null ? emoji : undefined,
        color,
      };

      showToast(
        <div>
          已新增分類 - <b translate="no">{newCategory.name}</b>
        </div>,
      );

      setUser((prevUser) => ({
        ...prevUser,
        categories: [...prevUser.categories, newCategory],
      }));

      setName("");
      setColor(theme.primary);
      setEmoji("");
    } else {
      showToast("請輸入分類名稱。", {
        type: "error",
        preventDuplicate: true,
        id: "category-name-required",
        visibleToasts: toasts,
      });
    }
  };

  const handleEditDimiss = () => {
    setSelectedCategoryId(undefined);
    setOpenEditDialog(false);
    setEditColor(theme.primary);
    setEditName("");
    setEditEmoji(null);
  };

  const handleEditCategory = () => {
    updateCategory({
      id: selectedCategoryId,
      name: editName,
      emoji: editEmoji || undefined,
      color: editColor,
      lastSave: new Date(),
    });

    showToast(
      <div>
        已更新分類 - <b translate="no">{editName}</b>
      </div>,
    );

    setOpenEditDialog(false);
  };

  const handleAddToFavorites = (category: Category) => {
    setUser((user) => ({
      ...user,
      favoriteCategories: user.favoriteCategories.includes(category.id)
        ? user.favoriteCategories.filter((id) => id !== category.id)
        : [...user.favoriteCategories, category.id],
      categories: user.categories.map((cat) =>
        cat.id === category.id ? { ...cat, lastSave: new Date() } : cat,
      ),
    }));
  };

  const getAssociatedTasks = (categoryId: UUID): Task[] => {
    return user.tasks.filter((task) => task.category?.some((cat) => cat.id === categoryId));
  };

  if (!user.settings.enableCategories) {
    return <NotFound message="分類功能尚未啟用。" />;
  }

  return (
    <>
      <TopBar title="分類" />
      <CategoriesContainer>
        {user.categories.length > 0 ? (
          <CategoryElementsContainer>
            {user.categories.map((category) => {
              const categoryTasks = user.tasks.filter((task) =>
                task.category?.some((cat) => cat.id === category.id),
              );

              const completedTasksCount = categoryTasks.reduce(
                (count, task) => (task.done ? count + 1 : count),
                0,
              );
              const totalTasksCount = categoryTasks.length;
              const completionPercentage =
                totalTasksCount > 0 ? Math.floor((completedTasksCount / totalTasksCount) * 100) : 0;

              const displayPercentage = totalTasksCount > 0 ? `(${completionPercentage}%)` : "";

              return (
                <CategoryElement key={category.id} clr={category.color}>
                  <CategoryContent translate="no">
                    <span>
                      {category.emoji && (
                        <Emoji unified={category.emoji} emojiStyle={user.emojisStyle} />
                      )}
                    </span>
                    &nbsp;
                    <span style={{ wordBreak: "break-all", fontWeight: 600 }}>{category.name}</span>
                    {totalTasksCount > 0 && (
                      <Tooltip title="此分類中任務的完成百分比">
                        <span style={{ opacity: 0.8, fontStyle: "italic" }}>
                          {displayPercentage}
                        </span>
                      </Tooltip>
                    )}
                  </CategoryContent>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <ActionButton>
                      <IconButton color="warning" onClick={() => handleAddToFavorites(category)}>
                        {user.favoriteCategories.includes(category.id) ? (
                          <StarChecked color="warning" />
                        ) : (
                          <StarUnchecked color="disabled" />
                        )}
                      </IconButton>
                    </ActionButton>
                    <ActionButton>
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setOpenEditDialog(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </ActionButton>
                    <ActionButton>
                      <IconButton
                        color="error"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          if (
                            totalTasksCount > 0 ||
                            user.favoriteCategories.includes(category.id)
                          ) {
                            // Open delete dialog if there are tasks associated to catagory or if it's a favorite
                            setOpenDeleteDialog(true);
                          } else {
                            // If no associated tasks, directly handle deletion
                            handleDelete(category.id);
                          }
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </ActionButton>
                  </div>
                </CategoryElement>
              );
            })}
          </CategoryElementsContainer>
        ) : (
          <p>您尚未建立任何分類</p>
        )}
        <AddContainer>
          <h2>新增分類</h2>
          <CustomEmojiPicker
            emoji={typeof emoji === "string" ? emoji : undefined}
            setEmoji={setEmoji}
            color={color}
            name={name}
            type="category"
          />
          <InputThemeProvider>
            <CategoryInput
              required
              label="分類名稱"
              placeholder="輸入分類名稱"
              value={name}
              onChange={handleNameChange}
              error={nameError !== ""}
              helperText={
                name == ""
                  ? undefined
                  : !nameError
                    ? `${name.length}/${CATEGORY_NAME_MAX_LENGTH}`
                    : nameError
              }
            />
          </InputThemeProvider>
          <ColorPicker
            color={color}
            onColorChange={(color) => {
              setColor(color);
            }}
            width={400}
            fontColor={getFontColor(theme.secondary)}
          />
          <AddCategoryButton
            onClick={handleAddCategory}
            disabled={name.length > CATEGORY_NAME_MAX_LENGTH}
          >
            建立分類
          </AddCategoryButton>
        </AddContainer>
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <CustomDialogTitle
            title="刪除此分類？"
            subTitle="此操作無法復原。"
            icon={<DeleteRounded />}
            onClose={() => setOpenDeleteDialog(false)}
          />

          <DialogContent>
            {selectedCategory ? (
              <>
                <CategoryBadge
                  glow={false}
                  category={user.categories.find((cat) => cat.id === selectedCategoryId)!}
                  sx={{ width: "100%", height: "100%", margin: "0 auto", borderRadius: "12px" }}
                />
                {getAssociatedTasks(selectedCategoryId!).length > 0 && (
                  <AssociatedTasksAccordion>
                    <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                      <span style={{ fontWeight: 600 }}>
                        {`關聯任務 (${getAssociatedTasks(selectedCategoryId!).length})`}
                      </span>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, m: 0 }}>
                      <ul>
                        {user.tasks
                          .filter((task) =>
                            task.category?.some((cat) => cat.id === selectedCategoryId),
                          )
                          .map((task) => (
                            <li key={task.id}>{task.name}</li>
                          ))}
                      </ul>
                    </AccordionDetails>
                  </AssociatedTasksAccordion>
                )}
              </>
            ) : (
              <p style={{ textAlign: "center" }}>找不到分類</p>
            )}
          </DialogContent>

          <DialogActions>
            <DialogBtn onClick={() => setOpenDeleteDialog(false)}>取消</DialogBtn>
            <DialogBtn
              onClick={() => {
                handleDelete(selectedCategoryId);
                setOpenDeleteDialog(false);
              }}
              color="error"
            >
              <DeleteRounded /> &nbsp; 刪除
            </DialogBtn>
          </DialogActions>
        </Dialog>
        {/* Edit Dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleEditDimiss}
          slotProps={{
            paper: {
              style: {
                borderRadius: "24px",
                padding: "12px",
                minWidth: "350px",
              },
            },
          }}
        >
          <CustomDialogTitle
            title="編輯分類"
            subTitle={editLastSaveLabel}
            icon={<Edit />}
            onClose={handleEditDimiss}
          />

          <DialogContent>
            <CustomEmojiPicker
              emoji={
                user.categories.find((cat) => cat.id === selectedCategoryId)?.emoji || undefined
              }
              setEmoji={setEditEmoji}
              color={editColor}
              name={editName}
              type="category"
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <EditNameInput
                label="輸入分類名稱"
                placeholder="輸入分類名稱"
                value={editName}
                error={editNameError !== "" || editName.length === 0}
                onChange={handleEditNameChange}
                helperText={
                  editNameError
                    ? editNameError
                    : editName.length === 0
                      ? "請輸入分類名稱"
                      : `${editName.length}/${CATEGORY_NAME_MAX_LENGTH}`
                }
              />
              <ColorPicker
                color={editColor}
                width="350px"
                fontColor={theme.darkmode ? ColorPalette.fontLight : ColorPalette.fontDark}
                onColorChange={(clr) => {
                  setEditColor(clr);
                }}
              />
            </div>
          </DialogContent>
          <DialogActions>
            <DialogBtn onClick={handleEditDimiss}>取消</DialogBtn>
            <DialogBtn
              onClick={handleEditCategory}
              disabled={editNameError !== "" || editName.length === 0}
            >
              <SaveRounded /> &nbsp; 儲存
            </DialogBtn>
          </DialogActions>
        </Dialog>
      </CategoriesContainer>
    </>
  );
};

export default Categories;
