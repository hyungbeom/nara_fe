"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Breadcrumb,
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Spin,
  Table,
  Tag,
  Upload,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderAddOutlined,
  FolderFilled,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  createGoogleDriveFolder,
  deleteGoogleDriveFile,
  checkNotebookLMProjects,
  createNotebookLMProject,
  getNotebookLMProjectHistory,
  getNotebookLMProjectSources,
  getNotebookLMProjectSourceContent,
  getNotebookLMProjectSummary,
  getNotebookLMResearchStatus,
  getNotebookLMStepRunStatus,
  getNotebookLMSteps,
  getGoogleDriveDownloadUrl,
  getGoogleDriveStatus,
  listGoogleDriveFiles,
  renameGoogleDriveFile,
  runNotebookLMStep,
  saveNotebookLMSteps,
  updateNotebookLMProjectSourceSelection,
  uploadGoogleDriveFile,
} from "@/lib/api";
import MarkdownPreviewModal from "@/components/notebooklm/MarkdownPreviewModal";
import NotebookSummaryPanel from "@/components/notebooklm/NotebookSummaryPanel";
import StepPromptEditorModal from "@/components/notebooklm/StepPromptEditorModal";
import { buildMarkdownPreviewFromPrompt, resolveNotebookPromptTitle } from "@/components/notebooklm/notebooklmPrompt";
import type { GoogleDriveFile, GoogleDriveList, GoogleDriveStatus } from "@/types/googleDrive";
import type { NotebookLMProjectPrompt, NotebookLMProjectSourceItem, NotebookLMProjectSummary, NotebookLMResearchStatus, NotebookLMStep, NotebookLMStepRunStatus } from "@/types/notebooklm";
import styles from "./GoogleDriveExplorer.module.css";

function formatFileSize(size: number | null) {
  if (size == null || size <= 0) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatModifiedTime(value: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR");
}

function getFileTypeLabel(file: GoogleDriveFile) {
  if (file.folder) {
    return "폴더";
  }
  if (file.mimeType.includes("pdf")) {
    return "PDF";
  }
  if (file.mimeType.startsWith("image/")) {
    return "이미지";
  }
  if (file.mimeType.includes("spreadsheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    return "스프레드시트";
  }
  if (file.mimeType.includes("document") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
    return "문서";
  }
  if (file.mimeType.startsWith("text/")) {
    return "텍스트";
  }
  return "파일";
}

function FileIcon({ file }: { file: GoogleDriveFile }) {
  if (file.folder) {
    return <FolderFilled className={styles.folderIcon} />;
  }
  if (file.mimeType.includes("pdf")) {
    return <FilePdfOutlined className={styles.fileIconPdf} />;
  }
  if (file.mimeType.startsWith("image/")) {
    return <FileImageOutlined className={styles.fileIconImage} />;
  }
  if (file.mimeType.includes("spreadsheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    return <FileExcelOutlined className={styles.fileIconExcel} />;
  }
  if (file.mimeType.includes("document") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
    return <FileWordOutlined className={styles.fileIconWord} />;
  }
  if (file.mimeType.startsWith("text/")) {
    return <FileTextOutlined className={styles.fileIconText} />;
  }
  return <FileOutlined className={styles.fileIconDefault} />;
}

function getResearchStatusTagColor(status: string) {
  switch (status) {
    case "in_progress":
      return "processing";
    case "completed":
      return "success";
    case "failed":
    case "timeout":
      return "error";
    default:
      return "default";
  }
}

function normalizeStepId(value?: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function isSameStepId(left?: string | null, right?: string | null) {
  return normalizeStepId(left) === normalizeStepId(right);
}

export default function GoogleDriveExplorer() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [listing, setListing] = useState<GoogleDriveList | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notebookAuthenticated, setNotebookAuthenticated] = useState(false);
  const [notebookMatches, setNotebookMatches] = useState<Record<string, boolean>>({});
  const [isCheckingNotebook, setIsCheckingNotebook] = useState(false);
  const [projectModalFolder, setProjectModalFolder] = useState<GoogleDriveFile | null>(null);
  const [projectModalFiles, setProjectModalFiles] = useState<GoogleDriveFile[]>([]);
  const [projectModalLoading, setProjectModalLoading] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [historyModalFolder, setHistoryModalFolder] = useState<GoogleDriveFile | null>(null);
  const [historyModalLoading, setHistoryModalLoading] = useState(false);
  const [historyPrompts, setHistoryPrompts] = useState<NotebookLMProjectPrompt[]>([]);
  const [notebookSteps, setNotebookSteps] = useState<NotebookLMStep[]>([]);
  const [stepRunStatus, setStepRunStatus] = useState<NotebookLMStepRunStatus | null>(null);
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [researchStatus, setResearchStatus] = useState<NotebookLMResearchStatus | null>(null);
  const [notebookSources, setNotebookSources] = useState<NotebookLMProjectSourceItem[]>([]);
  const [isUpdatingSourceSelection, setIsUpdatingSourceSelection] = useState(false);
  const [markdownPreview, setMarkdownPreview] = useState<{ title: string; content: string } | null>(null);
  const [projectSummary, setProjectSummary] = useState<NotebookLMProjectSummary | null>(null);
  const [isLoadingProjectSummary, setIsLoadingProjectSummary] = useState(false);
  const [stepEditorOpen, setStepEditorOpen] = useState(false);
  const [stepEditorMode, setStepEditorMode] = useState<"add" | "edit">("edit");
  const [editingStep, setEditingStep] = useState<NotebookLMStep | null>(null);
  const [loadingSourcePreviewId, setLoadingSourcePreviewId] = useState<string | null>(null);

  const researchReportSource = useMemo(
    () => notebookSources.find((source) => source.category === "research_report") ?? null,
    [notebookSources]
  );

  const runningStepId = useMemo(() => {
    if (pendingStepId) {
      return pendingStepId;
    }
    if (stepRunStatus?.status === "in_progress" && stepRunStatus.step) {
      return stepRunStatus.step;
    }
    return null;
  }, [pendingStepId, stepRunStatus]);

  const runningStepLabel = useMemo(() => {
    if (!runningStepId) {
      return null;
    }
    return notebookSteps.find((step) => isSameStepId(step.id, runningStepId))?.label ?? runningStepId;
  }, [notebookSteps, runningStepId]);

  const loadNotebookProjectStatus = useCallback(async (files: GoogleDriveFile[]) => {
    const folderNames = files.filter((file) => file.folder).map((file) => file.name);
    if (folderNames.length === 0) {
      setNotebookAuthenticated(false);
      setNotebookMatches({});
      return;
    }

    setIsCheckingNotebook(true);
    try {
      const result = await checkNotebookLMProjects(folderNames);
      setNotebookAuthenticated(result.authenticated);
      setNotebookMatches(result.matches);
    } catch {
      setNotebookAuthenticated(false);
      setNotebookMatches({});
    } finally {
      setIsCheckingNotebook(false);
    }
  }, []);

  const selectedFile = useMemo(
    () => listing?.files.find((file) => file.id === selectedFileId) ?? null,
    [listing, selectedFileId]
  );

  const loadFolder = useCallback(async (folderId?: string, options?: { pushHistory?: boolean }) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await listGoogleDriveFiles(folderId);
      setListing(data);
      setSelectedFileId(null);
      void loadNotebookProjectStatus(data.files);
      if (options?.pushHistory && folderId) {
        setHistory((prev) => [...prev, folderId]);
      }
      return data;
    } catch (error) {
      const text = error instanceof Error ? error.message : "파일 목록을 불러오지 못했습니다.";
      setErrorMessage(text);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadNotebookProjectStatus]);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage("");

    try {
      const driveStatus = await getGoogleDriveStatus();
      setStatus(driveStatus);

      if (!driveStatus.available) {
        setListing(null);
        return;
      }

      await loadFolder(driveStatus.rootFolderId);
      setHistory([]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Google Drive 상태를 확인하지 못했습니다.";
      setErrorMessage(text);
    } finally {
      setIsInitializing(false);
    }
  }, [loadFolder]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const openFolder = useCallback(
    async (file: GoogleDriveFile) => {
      if (!file.folder) {
        return;
      }
      await loadFolder(file.id, { pushHistory: true });
    },
    [loadFolder]
  );

  const handleRefresh = useCallback(async () => {
    if (!listing) {
      await initialize();
      return;
    }
    await loadFolder(listing.currentFolderId);
  }, [initialize, listing, loadFolder]);

  const handleBack = useCallback(async () => {
    if (history.length === 0) {
      return;
    }
    const nextHistory = [...history];
    nextHistory.pop();
    const previousFolderId = nextHistory[nextHistory.length - 1] ?? status?.rootFolderId;
    setHistory(nextHistory);
    await loadFolder(previousFolderId);
  }, [history, loadFolder, status?.rootFolderId]);

  const handleUp = useCallback(async () => {
    if (!listing?.parentFolderId) {
      return;
    }
    setHistory([]);
    await loadFolder(listing.parentFolderId);
  }, [listing, loadFolder]);

  const handleBreadcrumbClick = useCallback(
    async (folderId: string) => {
      setHistory([]);
      await loadFolder(folderId);
    },
    [loadFolder]
  );

  const handleCreateFolder = useCallback(async () => {
    if (!listing || !newFolderName.trim()) {
      message.warning("폴더 이름을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoogleDriveFolder(newFolderName.trim(), listing.currentFolderId);
      message.success("폴더를 만들었습니다.");
      setFolderModalOpen(false);
      setNewFolderName("");
      await loadFolder(listing.currentFolderId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "폴더 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, loadFolder, message, newFolderName]);

  const handleRename = useCallback(async () => {
    if (!selectedFile || !renameValue.trim()) {
      message.warning("새 이름을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await renameGoogleDriveFile(selectedFile.id, renameValue.trim());
      message.success("이름을 변경했습니다.");
      setRenameModalOpen(false);
      setRenameValue("");
      if (listing) {
        await loadFolder(listing.currentFolderId);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "이름 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, loadFolder, message, renameValue, selectedFile]);

  const handleDelete = useCallback(async () => {
    if (!selectedFile || !listing) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteGoogleDriveFile(selectedFile.id);
      message.success("삭제했습니다.");
      await loadFolder(listing.currentFolderId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, loadFolder, message, selectedFile]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!listing) {
        return Upload.LIST_IGNORE;
      }

      setIsSubmitting(true);
      try {
        await uploadGoogleDriveFile(listing.currentFolderId, file);
        message.success(`"${file.name}" 업로드 완료`);
        await loadFolder(listing.currentFolderId);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "업로드에 실패했습니다.");
      } finally {
        setIsSubmitting(false);
      }

      return Upload.LIST_IGNORE;
    },
    [listing, loadFolder, message]
  );

  const openProjectModal = useCallback(
    async (folder: GoogleDriveFile) => {
      setProjectModalFolder(folder);
      setProjectModalFiles([]);
      setSelectedSourceIds([]);
      setProjectModalLoading(true);

      try {
        const data = await listGoogleDriveFiles(folder.id);
        const files = data.files.filter((file) => !file.folder);
        setProjectModalFiles(files);
        setSelectedSourceIds(files.map((file) => file.id));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "폴더 파일 목록을 불러오지 못했습니다.");
        setProjectModalFolder(null);
      } finally {
        setProjectModalLoading(false);
      }
    },
    [message]
  );

  const closeProjectModal = useCallback(() => {
    setProjectModalFolder(null);
    setProjectModalFiles([]);
    setSelectedSourceIds([]);
    setProjectModalLoading(false);
    setIsCreatingProject(false);
  }, []);

  const toggleSourceSelection = useCallback((fileId: string, checked: boolean) => {
    setSelectedSourceIds((prev) => {
      if (checked) {
        return prev.includes(fileId) ? prev : [...prev, fileId];
      }
      return prev.filter((id) => id !== fileId);
    });
  }, []);

  const handleCreateNotebookProject = useCallback(async () => {
    if (!projectModalFolder) {
      return;
    }
    if (selectedSourceIds.length === 0) {
      message.warning("소스로 추가할 파일을 하나 이상 선택해 주세요.");
      return;
    }

    const selectedFiles = projectModalFiles.filter((file) => selectedSourceIds.includes(file.id));
    setIsCreatingProject(true);
    try {
      const result = await createNotebookLMProject({
        projectName: projectModalFolder.name,
        sources: selectedFiles.map((file) => ({
          driveFileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
        })),
      });

      setNotebookMatches((prev) => ({
        ...prev,
        [projectModalFolder.name]: true,
      }));

      if (result.failedFiles.length > 0) {
        message.warning(
          `프로젝트를 생성했지만 일부 파일 추가에 실패했습니다. (${result.addedSourceCount}개 성공, ${result.failedFiles.length}개 실패)`
        );
      } else if (result.deepResearchStarted) {
        message.success(
          `NotebookLM 프로젝트 "${result.projectName}"를 생성했습니다. Deep Research가 백그라운드에서 시작되었습니다.`
        );
      } else {
        message.success(`NotebookLM 프로젝트 "${result.projectName}"를 생성했습니다.`);
      }
      closeProjectModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "NotebookLM 프로젝트 생성에 실패했습니다.");
    } finally {
      setIsCreatingProject(false);
    }
  }, [closeProjectModal, message, projectModalFiles, projectModalFolder, selectedSourceIds]);

  const loadHistoryPrompts = useCallback(async (folderName: string) => {
    const result = await getNotebookLMProjectHistory(folderName);
    setHistoryPrompts(result.prompts);
  }, []);

  const loadStepRunStatus = useCallback(async (folderName: string) => {
    try {
      const result = await getNotebookLMStepRunStatus(folderName);
      setStepRunStatus(result);
      return result;
    } catch {
      setStepRunStatus(null);
      return null;
    }
  }, []);

  const loadResearchStatus = useCallback(async (folderName: string) => {
    try {
      const result = await getNotebookLMResearchStatus(folderName);
      setResearchStatus(result);
      return result;
    } catch {
      setResearchStatus(null);
      return null;
    }
  }, []);

  const loadNotebookSources = useCallback(async (folderName: string) => {
    try {
      const result = await getNotebookLMProjectSources(folderName);
      setNotebookSources(result.sources);
      return result;
    } catch {
      setNotebookSources([]);
      return null;
    }
  }, []);

  const loadProjectSummary = useCallback(async (folderName: string) => {
    setIsLoadingProjectSummary(true);
    try {
      const result = await getNotebookLMProjectSummary(folderName);
      setProjectSummary(result);
      return result;
    } catch {
      setProjectSummary(null);
      return null;
    } finally {
      setIsLoadingProjectSummary(false);
    }
  }, []);

  const openHistoryModal = useCallback(
    async (folder: GoogleDriveFile) => {
      setHistoryModalFolder(folder);
      setHistoryPrompts([]);
      setResearchStatus(null);
      setStepRunStatus(null);
      setPendingStepId(null);
      setNotebookSources([]);
      setHistoryModalLoading(true);
      setMarkdownPreview(null);
      setProjectSummary(null);

      try {
        const [historyResult, stepsResult, researchResult, sourcesResult, summaryResult, stepStatusResult] = await Promise.all([
          getNotebookLMProjectHistory(folder.name),
          getNotebookLMSteps(),
          getNotebookLMResearchStatus(folder.name).catch(() => null),
          getNotebookLMProjectSources(folder.name).catch(() => null),
          getNotebookLMProjectSummary(folder.name).catch(() => null),
          getNotebookLMStepRunStatus(folder.name).catch(() => null),
        ]);
        setHistoryPrompts(historyResult.prompts);
        setNotebookSteps(stepsResult);
        if (researchResult) {
          setResearchStatus(researchResult);
        }
        if (sourcesResult) {
          setNotebookSources(sourcesResult.sources);
        }
        if (summaryResult) {
          setProjectSummary(summaryResult);
        }
        if (stepStatusResult) {
          setStepRunStatus(stepStatusResult);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "프롬프트 기록을 불러오지 못했습니다.");
        setHistoryModalFolder(null);
      } finally {
        setHistoryModalLoading(false);
      }
    },
    [message]
  );

  const closeHistoryModal = useCallback(() => {
    setHistoryModalFolder(null);
    setHistoryPrompts([]);
    setNotebookSteps([]);
    setNotebookSources([]);
    setStepRunStatus(null);
    setPendingStepId(null);
    setResearchStatus(null);
    setHistoryModalLoading(false);
    setMarkdownPreview(null);
    setProjectSummary(null);
  }, []);

  useEffect(() => {
    if (!historyModalFolder) {
      return;
    }

    if (researchStatus?.status !== "in_progress") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const result = await loadResearchStatus(historyModalFolder.name);
      if (result && result.status !== "in_progress") {
        await Promise.all([
          loadNotebookSources(historyModalFolder.name),
          loadProjectSummary(historyModalFolder.name),
        ]);
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [historyModalFolder, loadNotebookSources, loadProjectSummary, loadResearchStatus, researchStatus?.status]);

  useEffect(() => {
    if (!historyModalFolder) {
      return;
    }

    if (stepRunStatus?.status !== "in_progress") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const result = await loadStepRunStatus(historyModalFolder.name);
      if (!result) {
        return;
      }

      if (result.status === "completed") {
        setPendingStepId(null);
        await loadHistoryPrompts(historyModalFolder.name);
        if (result.answer) {
          setMarkdownPreview({
            title: `${result.step ?? "STEP"} 결과`,
            content: result.answer,
          });
        }
        message.success(result.message || "프롬프트 실행이 완료되었습니다.");
      } else if (result.status === "failed") {
        setPendingStepId(null);
        message.error(result.message || "프롬프트 실행에 실패했습니다.");
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [historyModalFolder, loadHistoryPrompts, loadStepRunStatus, message, stepRunStatus?.status]);

  useEffect(() => {
    if (!historyModalFolder) {
      return;
    }
    if (researchStatus?.status === "completed" || researchStatus?.status === "no_research") {
      void Promise.all([
        loadNotebookSources(historyModalFolder.name),
        loadProjectSummary(historyModalFolder.name),
      ]);
    }
  }, [historyModalFolder, loadNotebookSources, loadProjectSummary, researchStatus?.status]);

  const toggleNotebookSourceSelection = useCallback(
    async (sourceId: string, checked: boolean) => {
      if (!historyModalFolder) {
        return;
      }

      const nextSelectedIds = checked
        ? [...new Set([...notebookSources.filter((source) => source.checked).map((source) => source.id), sourceId])]
        : notebookSources.filter((source) => source.checked && source.id !== sourceId).map((source) => source.id);

      setIsUpdatingSourceSelection(true);
      try {
        const result = await updateNotebookLMProjectSourceSelection(historyModalFolder.name, nextSelectedIds);
        setNotebookSources(result.sources);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "소스 선택을 저장하지 못했습니다.");
      } finally {
        setIsUpdatingSourceSelection(false);
      }
    },
    [historyModalFolder, message, notebookSources]
  );

  const getSourceCategoryLabel = (category: string) => {
    switch (category) {
      case "initial":
        return "초기 첨부";
      case "research_report":
        return "리서치 보고서";
      default:
        return "기타";
    }
  };

  const handleRunNotebookStep = useCallback(
    async (stepId: string) => {
      if (!historyModalFolder) {
        return;
      }
      if (runningStepId != null && !isSameStepId(runningStepId, stepId)) {
        return;
      }

      setPendingStepId(stepId);
      setStepRunStatus({
        projectName: historyModalFolder.name,
        step: stepId,
        status: "in_progress",
        message: `${stepId} 실행 중`,
      });

      try {
        const result = await runNotebookLMStep(historyModalFolder.name, stepId);
        setStepRunStatus(result);
        setPendingStepId(null);
        if (result.status === "completed" && result.answer) {
          await loadHistoryPrompts(historyModalFolder.name);
          setMarkdownPreview({
            title: `${stepId} 결과`,
            content: result.answer,
          });
          message.success(`${stepId} 결과를 생성했습니다.`);
        } else if (result.status === "failed") {
          message.error(result.message || "프롬프트 실행에 실패했습니다.");
        } else if (result.status === "in_progress") {
          message.info(result.message || `${stepId} 실행을 시작했습니다.`);
        }
      } catch (error) {
        setPendingStepId(null);
        await loadStepRunStatus(historyModalFolder.name);
        message.error(error instanceof Error ? error.message : "프롬프트 실행에 실패했습니다.");
      }
    },
    [historyModalFolder, loadHistoryPrompts, loadStepRunStatus, message, runningStepId]
  );

  const openAddStepEditor = useCallback(() => {
    const nextIndex = notebookSteps.reduce((max, step) => {
      const matched = /^STEP(\d+)$/i.exec(step.id);
      if (!matched) {
        return max;
      }
      return Math.max(max, Number(matched[1]));
    }, 0) + 1;
    const nextId = `STEP${nextIndex}`;
    setStepEditorMode("add");
    setEditingStep({
      id: nextId,
      label: nextId,
      prompt: "",
    });
    setStepEditorOpen(true);
  }, [notebookSteps]);

  const openEditStepEditor = useCallback((step: NotebookLMStep) => {
    setStepEditorMode("edit");
    setEditingStep(step);
    setStepEditorOpen(true);
  }, []);

  const closeStepEditor = useCallback(() => {
    setStepEditorOpen(false);
    setEditingStep(null);
  }, []);

  const handleSaveStep = useCallback(
    async (step: NotebookLMStep) => {
      const nextSteps =
        stepEditorMode === "add"
          ? [...notebookSteps, step]
          : notebookSteps.map((item) => (item.id === step.id ? step : item));

      try {
        const savedSteps = await saveNotebookLMSteps(nextSteps);
        setNotebookSteps(savedSteps);
        closeStepEditor();
        message.success(stepEditorMode === "add" ? "프롬프트 단계를 추가했습니다." : "프롬프트를 수정했습니다.");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "프롬프트 저장에 실패했습니다.");
      }
    },
    [closeStepEditor, message, notebookSteps, stepEditorMode]
  );

  const handleViewSourceMarkdown = useCallback(
    async (source: NotebookLMProjectSourceItem) => {
      if (!historyModalFolder) {
        return;
      }

      setLoadingSourcePreviewId(source.id);
      try {
        const result = await getNotebookLMProjectSourceContent(historyModalFolder.name, source.id);
        setMarkdownPreview({
          title: result.title || source.title || "소스 미리보기",
          content: result.content,
        });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "소스 내용을 불러오지 못했습니다.");
      } finally {
        setLoadingSourcePreviewId(null);
      }
    },
    [historyModalFolder, message]
  );

  const columns: TableColumnsType<GoogleDriveFile> = [
    {
      title: "이름",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name, "ko"),
      render: (_, record) => (
        <span className={styles.nameCell}>
          <FileIcon file={record} />
          <span>{record.name}</span>
        </span>
      ),
    },
    {
      title: "수정한 날짜",
      dataIndex: "modifiedTime",
      key: "modifiedTime",
      width: 180,
      render: (value: string | null) => formatModifiedTime(value),
    },
    {
      title: "유형",
      key: "type",
      width: 120,
      render: (_, record) => getFileTypeLabel(record),
    },
    {
      title: "크기",
      dataIndex: "size",
      key: "size",
      width: 100,
      align: "right",
      render: (value: number | null, record) => (record.folder ? "-" : formatFileSize(value)),
    },
    {
      title: "NotebookLM",
      key: "notebooklm",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (!record.folder) {
          return "-";
        }
        if (isCheckingNotebook) {
          return <Tag color="processing">확인 중</Tag>;
        }
        if (!notebookAuthenticated) {
          return <Tag>미연동</Tag>;
        }
        return notebookMatches[record.name] ? (
          <Tag
            color="success"
            className={styles.notebookExistsTag}
            onClick={(event) => {
              event.stopPropagation();
              void openHistoryModal(record);
            }}
          >
            있음
          </Tag>
        ) : (
          <Tag
            color="default"
            className={styles.notebookMissingTag}
            onClick={(event) => {
              event.stopPropagation();
              void openProjectModal(record);
            }}
          >
            없음
          </Tag>
        );
      },
    },
  ];

  if (isInitializing) {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="large" />
      </div>
    );
  }

  if (!status?.available) {
    return (
      <div className={styles.setupPanel}>
        <h2 className={styles.setupTitle}>Google Drive 연동 설정 필요</h2>
        <p className={styles.setupText}>
          공유 드라이브를 사용하려면 백엔드에 서비스 계정 설정이 필요합니다.
        </p>
        <ul className={styles.setupList}>
          <li>Google Cloud Console에서 Drive API 활성화</li>
          <li>서비스 계정 JSON 키 발급</li>
          <li>공유 드라이브에 서비스 계정 이메일을 멤버로 추가</li>
          <li>
            <code>application.properties</code>에 <code>app.google-drive.credentials-path</code>,{" "}
            <code>app.google-drive.shared-drive-id</code> 설정
          </li>
        </ul>
        {status?.sharedDriveId ? (
          <p className={styles.setupMeta}>설정된 공유 드라이브 ID: {status.sharedDriveId}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar}>
        <div className={styles.navGroup}>
          <Button icon={<ArrowLeftOutlined />} disabled={history.length === 0} onClick={handleBack} />
          <Button icon={<ArrowUpOutlined />} disabled={!listing?.parentFolderId} onClick={handleUp} />
          <Button icon={<ReloadOutlined />} loading={isLoading} onClick={handleRefresh} />
        </div>

        <div className={styles.actionGroup}>
          <Button icon={<FolderAddOutlined />} onClick={() => setFolderModalOpen(true)}>
            새 폴더
          </Button>
          <Upload
            multiple
            showUploadList={false}
            beforeUpload={handleUpload}
            disabled={isSubmitting || isLoading}
          >
            <Button icon={<CloudUploadOutlined />} loading={isSubmitting}>
              업로드
            </Button>
          </Upload>
          <Button
            icon={<EditOutlined />}
            disabled={!selectedFile}
            onClick={() => {
              if (selectedFile) {
                setRenameValue(selectedFile.name);
                setRenameModalOpen(true);
              }
            }}
          >
            이름 변경
          </Button>
          {selectedFile && !selectedFile.folder ? (
            <Button
              icon={<DownloadOutlined />}
              href={getGoogleDriveDownloadUrl(selectedFile.id)}
              target="_blank"
              rel="noreferrer"
            >
              다운로드
            </Button>
          ) : (
            <Button icon={<DownloadOutlined />} disabled>
              다운로드
            </Button>
          )}
          <Popconfirm
            title="선택한 항목을 삭제할까요?"
            description={selectedFile?.name}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
            disabled={!selectedFile}
            onConfirm={handleDelete}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!selectedFile} loading={isSubmitting}>
              삭제
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className={styles.addressBar}>
        <Breadcrumb
          items={(listing?.breadcrumbs ?? []).map((item) => ({
            title: (
              <button type="button" className={styles.breadcrumbButton} onClick={() => handleBreadcrumbClick(item.id)}>
                {item.name}
              </button>
            ),
          }))}
        />
      </div>

      {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

      <div className={styles.filePane}>
        <Table<GoogleDriveFile>
          rowKey="id"
          size="middle"
          loading={isLoading}
          columns={columns}
          dataSource={listing?.files ?? []}
          pagination={false}
          locale={{ emptyText: <Empty description="이 폴더는 비어 있습니다." /> }}
          rowClassName={(record) =>
            record.id === selectedFileId ? `${styles.tableRow} ${styles.tableRowSelected}` : styles.tableRow
          }
          onRow={(record) => ({
            onClick: () => setSelectedFileId(record.id),
            onDoubleClick: () => openFolder(record),
          })}
        />
      </div>

      <Modal
        title="새 폴더"
        open={folderModalOpen}
        okText="만들기"
        cancelText="취소"
        confirmLoading={isSubmitting}
        onOk={handleCreateFolder}
        onCancel={() => {
          setFolderModalOpen(false);
          setNewFolderName("");
        }}
      >
        <Input
          value={newFolderName}
          placeholder="폴더 이름"
          onChange={(event) => setNewFolderName(event.target.value)}
          onPressEnter={handleCreateFolder}
        />
      </Modal>

      <Modal
        title="이름 변경"
        open={renameModalOpen}
        okText="변경"
        cancelText="취소"
        confirmLoading={isSubmitting}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalOpen(false);
          setRenameValue("");
        }}
      >
        <Input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>

      <Modal
        title={projectModalFolder ? `NotebookLM 프로젝트 생성 — ${projectModalFolder.name}` : "NotebookLM 프로젝트 생성"}
        open={projectModalFolder != null}
        okText="프로젝트 생성"
        cancelText="취소"
        confirmLoading={isCreatingProject}
        okButtonProps={{ disabled: selectedSourceIds.length === 0 }}
        onOk={handleCreateNotebookProject}
        onCancel={closeProjectModal}
        width={640}
      >
        <p className={styles.projectModalHint}>
          폴더 이름으로 NotebookLM 프로젝트가 생성되고, 선택한 파일이 소스로 등록됩니다. 이후 Deep Research가 자동으로
          시작됩니다.
        </p>
        {projectModalLoading ? (
          <div className={styles.projectModalLoading}>
            <Spin />
          </div>
        ) : projectModalFiles.length === 0 ? (
          <Empty description="이 폴더에 등록할 파일이 없습니다." />
        ) : (
          <div className={styles.projectFileList}>
            {projectModalFiles.map((file) => (
              <label key={file.id} className={styles.projectFileItem}>
                <Checkbox
                  checked={selectedSourceIds.includes(file.id)}
                  onChange={(event) => toggleSourceSelection(file.id, event.target.checked)}
                />
                <FileIcon file={file} />
                <span className={styles.projectFileName}>{file.name}</span>
                <span className={styles.projectFileMeta}>{formatFileSize(file.size)}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        title={historyModalFolder ? `NotebookLM 프롬프트 — ${historyModalFolder.name}` : "NotebookLM 프롬프트"}
        open={historyModalFolder != null}
        onCancel={closeHistoryModal}
        footer={
          <Button type="primary" onClick={closeHistoryModal}>
            닫기
          </Button>
        }
        width={720}
      >
        {researchStatus ? (
          <div className={styles.researchStatusBar}>
            <Tag color={getResearchStatusTagColor(researchStatus.status)}>{researchStatus.message}</Tag>
            {researchStatus.status === "in_progress" ? <Spin size="small" /> : null}
            {researchStatus.sourcesCount > 0 ? (
              <span className={styles.researchStatusMeta}>소스 {researchStatus.sourcesCount}개</span>
            ) : null}
          </div>
        ) : null}
        {runningStepId ? (
          <div className={styles.stepRunStatusBar}>
            <Tag color="processing">{runningStepLabel} 실행 중</Tag>
            <Spin size="small" />
            <span className={styles.stepRunStatusMeta}>
              NotebookLM 응답을 생성하고 있습니다. 완료까지 수 분 걸릴 수 있습니다.
            </span>
          </div>
        ) : null}
        {projectSummary?.showSummary ? (
          <NotebookSummaryPanel
            title="첨부파일 요약"
            summary={projectSummary.summary}
            message={projectSummary.message}
            loading={isLoadingProjectSummary}
          />
        ) : null}
        {researchReportSource ? (
          <div className={styles.researchReportSection}>
            <div className={styles.stepButtonTitle}>Deep Research 보고서</div>
            <div className={styles.researchReportCard}>
              <span className={styles.researchReportName}>{researchReportSource.title}</span>
              <Button
                size="small"
                type="primary"
                loading={loadingSourcePreviewId === researchReportSource.id}
                onClick={() => void handleViewSourceMarkdown(researchReportSource)}
              >
                마크다운 보기
              </Button>
            </div>
          </div>
        ) : null}
        {historyModalLoading ? (
          <div className={styles.projectModalLoading}>
            <Spin />
          </div>
        ) : historyPrompts.length === 0 ? (
          <Empty description="저장된 프롬프트가 없습니다." />
        ) : (
          <div className={styles.promptList}>
            {historyPrompts.map((prompt) => (
              <div key={prompt.turn} className={styles.promptItem}>
                <div className={styles.promptTurn}>#{prompt.turn}</div>
                <div className={styles.promptContent}>
                  <div className={styles.promptQuestion}>{resolveNotebookPromptTitle(prompt.question, prompt.turn)}</div>
                  <div className={styles.promptMeta}>{prompt.question}</div>
                  {prompt.answer ? (
                    <div className={styles.promptActions}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => setMarkdownPreview(buildMarkdownPreviewFromPrompt(prompt))}
                      >
                        마크다운 보기
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
        {notebookSources.length > 0 ? (
          <div className={styles.sourceChecklistSection}>
            <div className={styles.stepButtonTitle}>소스 선택</div>
            <p className={styles.sourceChecklistHint}>
              초기 첨부파일과 Deep Research 보고서만 표시됩니다. 완료 후 두 항목이 자동으로 선택됩니다.
            </p>
            <div className={styles.sourceChecklist}>
              {notebookSources.map((source) => (
                <label key={source.id} className={styles.sourceChecklistItem}>
                  <Checkbox
                    checked={source.checked}
                    disabled={isUpdatingSourceSelection}
                    onChange={(event) => void toggleNotebookSourceSelection(source.id, event.target.checked)}
                  />
                  <span className={styles.sourceChecklistName}>{source.title || source.id}</span>
                  <Tag className={styles.sourceChecklistTag}>{getSourceCategoryLabel(source.category)}</Tag>
                  {source.category === "research_report" ? (
                    <Button
                      size="small"
                      loading={loadingSourcePreviewId === source.id}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleViewSourceMarkdown(source);
                      }}
                    >
                      보기
                    </Button>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.stepButtonSection}>
          <div className={styles.stepButtonHeader}>
            <div className={styles.stepButtonTitle}>프롬프트 실행</div>
            <Button
              type="text"
              icon={<PlusOutlined />}
              aria-label="프롬프트 단계 추가"
              onClick={openAddStepEditor}
              disabled={runningStepId != null}
            />
          </div>
          <div className={styles.stepButtonList}>
            {notebookSteps.map((step) => {
              const isRunning = isSameStepId(runningStepId, step.id);
              return (
              <div
                key={step.id}
                className={`${styles.stepButtonRow} ${isRunning ? styles.stepButtonRowRunning : ""}`}
              >
                <Button
                  className={`${styles.stepRunButton} ${isRunning ? styles.stepRunButtonRunning : ""}`}
                  type={isRunning ? "primary" : "default"}
                  loading={isRunning}
                  disabled={runningStepId != null && !isRunning}
                  onClick={() => void handleRunNotebookStep(step.id)}
                >
                  {isRunning ? `${step.label} 실행 중...` : step.label}
                </Button>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  aria-label={`${step.label} 프롬프트 수정`}
                  onClick={() => openEditStepEditor(step)}
                />
              </div>
            );
            })}
          </div>
        </div>
      </Modal>
      <StepPromptEditorModal
        open={stepEditorOpen}
        mode={stepEditorMode}
        step={editingStep}
        onCancel={closeStepEditor}
        onSave={handleSaveStep}
      />
      <MarkdownPreviewModal
        open={markdownPreview != null}
        title={markdownPreview?.title ?? "마크다운 미리보기"}
        content={markdownPreview?.content ?? ""}
        onClose={() => setMarkdownPreview(null)}
      />
    </div>
  );
}
