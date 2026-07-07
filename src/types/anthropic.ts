export type AnthropicStatus = {
  enabled: boolean;
  configured: boolean;
  model: string;
  message: string;
};

export type AnthropicProjectCheckResult = {
  configured: boolean;
  matches: Record<string, boolean>;
};

export type AnthropicConversationMessage = {
  role: string;
  content: string;
  createdAt: string;
};

export type AnthropicConversationHistory = {
  projectName: string;
  count: number;
  messages: AnthropicConversationMessage[];
};

export type AnthropicMessageResult = {
  model: string;
  answer: string;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  savedDriveFileId?: string;
  savedDriveFileName?: string;
  driveSaveError?: string;
};

export type AnthropicPptJobStatus = "pending" | "in_progress" | "completed" | "failed";

export type AnthropicPptJob = {
  jobId: string;
  projectName: string;
  driveFolderId: string;
  status: AnthropicPptJobStatus;
  prompt: string;
  savedDriveFileId?: string;
  savedDriveFileName?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type AnthropicPptJobStartRequest = {
  projectName: string;
  driveFolderId: string;
  prompt: string;
  attachmentFileIds: string[];
};
