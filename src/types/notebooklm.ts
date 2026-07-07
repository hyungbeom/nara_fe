export type NotebookLMStatus = {
  enabled: boolean;
  pythonAvailable: boolean;
  authenticated: boolean;
  loginInProgress: boolean;
  accountEmail?: string;
  homePath?: string;
  message?: string;
  headlessReady: boolean;
};

export type NotebookLMProjectCheckResult = {
  authenticated: boolean;
  matches: Record<string, boolean>;
};

export type NotebookLMProjectSource = {
  driveFileId: string;
  fileName: string;
  mimeType: string;
};

export type NotebookLMCreateProjectRequest = {
  projectName: string;
  sources: NotebookLMProjectSource[];
};

export type NotebookLMCreateProjectResult = {
  notebookId: string;
  projectName: string;
  addedSourceCount: number;
  failedFiles: string[];
  deepResearchStarted?: boolean;
  deepResearchQuery?: string;
};

export type NotebookLMProjectPrompt = {
  turn: number;
  question: string;
  answer: string;
  status?: "completed" | "failed" | "running" | string;
  message?: string;
};

export type NotebookLMProjectHistoryResult = {
  authenticated: boolean;
  projectName: string;
  notebookId?: string;
  conversationId?: string;
  count: number;
  prompts: NotebookLMProjectPrompt[];
};

export type NotebookLMStep = {
  id: string;
  label: string;
  prompt: string;
};

export type NotebookLMRunStepResult = {
  step: string;
  projectName: string;
  notebookId: string;
  prompt: string;
  answer: string;
};

export type NotebookLMStepRunStatus = {
  projectName: string;
  notebookId?: string;
  step?: string;
  status: "idle" | "in_progress" | "completed" | "failed" | string;
  message?: string;
  answer?: string;
};

export type NotebookLMResearchStatus = {
  authenticated: boolean;
  projectName: string;
  notebookId?: string;
  status: string;
  query?: string;
  sourcesCount: number;
  message: string;
};

export type NotebookLMProjectSourceItem = {
  id: string;
  title: string;
  type: string;
  checked: boolean;
  category: "initial" | "research_report" | "other" | string;
};

export type NotebookLMProjectSourcesResult = {
  projectName: string;
  notebookId: string;
  sources: NotebookLMProjectSourceItem[];
};

export type NotebookLMProjectSummary = {
  authenticated: boolean;
  projectName: string;
  notebookId?: string;
  showSummary: boolean;
  summary?: string;
  message: string;
};

export type NotebookLMProjectSourceContent = {
  projectName: string;
  notebookId: string;
  sourceId: string;
  title: string;
  content: string;
};
