import type { ApiResponse, LoginRequest, LoginUser } from "@/types/auth";
import type { BidDetail, BidFavorite, BidFavoriteAttachment, BidSearchPage, BidSearchRequest } from "@/types/bid";
import type { GoogleDriveFile, GoogleDriveList, GoogleDriveStatus } from "@/types/googleDrive";
import type { NotebookLMCreateProjectRequest, NotebookLMCreateProjectResult, NotebookLMProjectCheckResult, NotebookLMProjectHistoryResult, NotebookLMProjectSourceContent, NotebookLMProjectSourcesResult, NotebookLMProjectSummary, NotebookLMResearchStatus, NotebookLMRunStepResult, NotebookLMStep, NotebookLMStepRunStatus, NotebookLMStatus } from "@/types/notebooklm";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 백엔드(8080)와 프론트(3000)가 실행 중인지 확인해 주세요.");
  }

  let body: ApiResponse<T>;

  const responseText = await response.text();

  try {
    body = JSON.parse(responseText) as ApiResponse<T>;
  } catch {
    const snippet = responseText.trim().slice(0, 120);
    throw new Error(
      snippet
        ? `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}: ${snippet})`
        : `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}, 빈 응답)`
    );
  }

  if (!response.ok || !body.success) {
    throw new Error(body.message || "요청에 실패했습니다.");
  }

  return body.data as T;
}

export function login(payload: LoginRequest) {
  return request<LoginUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser() {
  return request<LoginUser>("/api/auth/me");
}

export function logout() {
  return request<null>("/api/auth/logout", {
    method: "POST",
  });
}

export function searchBids(payload: BidSearchRequest) {
  return request<BidSearchPage>("/api/bids/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBidDetail(
  bidNo: string,
  bidOrd: string,
  announceDate: string,
  industryCode?: string,
  industryName?: string
) {
  const params = new URLSearchParams({ bidOrd, announceDate });
  if (industryCode) {
    params.set("industryCode", industryCode);
  }
  if (industryName) {
    params.set("industryName", industryName);
  }
  return request<BidDetail>(`/api/bids/${encodeURIComponent(bidNo)}?${params.toString()}`);
}

export function getBidFavorites() {
  return request<BidFavorite[]>("/api/bids/favorites");
}

export function checkBidFavorite(bidNo: string, bidOrd: string, announceDate: string) {
  const params = new URLSearchParams({ bidNo, bidOrd, announceDate });
  return request<{ favorited: boolean }>(`/api/bids/favorites/check?${params.toString()}`);
}

export function addBidFavorite(
  bid: BidFavorite | Omit<BidFavorite, "favoriteSeq" | "createdAt" | "attachments" | "detailContent">,
  options?: { industryCode?: string; industryName?: string }
) {
  return request<null>("/api/bids/favorites", {
    method: "POST",
    body: JSON.stringify({
      bidNo: bid.bidNo,
      bidOrd: bid.bidOrd,
      announceDate: bid.announceDate,
      bidName: bid.bidName,
      industry: bid.industry,
      contractMethod: bid.contractMethod,
      openingDate: bid.openingDate,
      estimatedPrice: bid.estimatedPrice,
      agency: bid.agency,
      detailUrl: bid.detailUrl,
      industryCode: options?.industryCode,
      industryName: options?.industryName,
    }),
  });
}

export function getFavoriteAttachmentDownloadUrl(attachmentSeq: number) {
  return `/api/bids/favorites/attachments/${attachmentSeq}/download`;
}

export function convertFavoriteAttachmentToPdf(attachmentSeq: number) {
  return request<BidFavoriteAttachment>(
    `/api/bids/favorites/attachments/${attachmentSeq}/convert-pdf`,
    {
      method: "POST",
    }
  );
}

export type GoogleDriveUploadAttachmentResult = {
  folderId: string;
  folderName: string;
  file: GoogleDriveFile;
};

export async function uploadFavoriteAttachmentToGoogleDrive(attachmentSeq: number) {
  let response: Response;

  try {
    response = await fetch(
      `/api/bids/favorites/attachments/${attachmentSeq}/upload-google-drive`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 백엔드(8080)와 프론트(3000)가 실행 중인지 확인해 주세요.");
  }

  const responseText = await response.text();
  let body: ApiResponse<null>;

  try {
    body = JSON.parse(responseText) as ApiResponse<null>;
  } catch {
    const snippet = responseText.trim().slice(0, 120);
    throw new Error(
      snippet
        ? `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}: ${snippet})`
        : `서버 응답을 처리할 수 없습니다. (HTTP ${response.status}, 빈 응답)`
    );
  }

  if (response.status !== 202 || !body.success) {
    throw new Error(body.message || "구글 드라이브 저장 요청에 실패했습니다.");
  }
}

export function removeBidFavorite(bidNo: string, bidOrd: string, announceDate: string) {
  const params = new URLSearchParams({ bidNo, bidOrd, announceDate });
  return request<null>(`/api/bids/favorites?${params.toString()}`, {
    method: "DELETE",
  });
}

export function getGoogleDriveStatus() {
  return request<GoogleDriveStatus>("/api/google-drive/status");
}

export function listGoogleDriveFiles(folderId?: string) {
  const params = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
  return request<GoogleDriveList>(`/api/google-drive/files${params}`);
}

export function createGoogleDriveFolder(name: string, parentId: string) {
  return request<GoogleDriveFile>("/api/google-drive/folders", {
    method: "POST",
    body: JSON.stringify({ name, parentId }),
  });
}

export async function uploadGoogleDriveFile(parentId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("parentId", parentId);

  const response = await fetch("/api/google-drive/files/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const responseText = await response.text();
  let body: ApiResponse<GoogleDriveFile>;

  try {
    body = JSON.parse(responseText) as ApiResponse<GoogleDriveFile>;
  } catch {
    throw new Error(`서버 응답을 처리할 수 없습니다. (HTTP ${response.status})`);
  }

  if (!response.ok || !body.success) {
    throw new Error(body.message || "파일 업로드에 실패했습니다.");
  }

  return body.data as GoogleDriveFile;
}

export function getGoogleDriveDownloadUrl(fileId: string) {
  return `/api/google-drive/files/${encodeURIComponent(fileId)}/download`;
}

export function renameGoogleDriveFile(fileId: string, name: string) {
  return request<GoogleDriveFile>(`/api/google-drive/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function deleteGoogleDriveFile(fileId: string) {
  return request<null>(`/api/google-drive/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
  });
}

export function getNotebookLMStatus() {
  return request<NotebookLMStatus>("/api/notebooklm/status");
}

export function checkNotebookLMProjects(names: string[]) {
  return request<NotebookLMProjectCheckResult>("/api/notebooklm/projects/check", {
    method: "POST",
    body: JSON.stringify({ names }),
  });
}

export function createNotebookLMProject(payload: NotebookLMCreateProjectRequest) {
  return request<NotebookLMCreateProjectResult>("/api/notebooklm/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getNotebookLMProjectHistory(projectName: string) {
  const params = new URLSearchParams({ projectName });
  return request<NotebookLMProjectHistoryResult>(`/api/notebooklm/projects/history?${params.toString()}`);
}

export function getNotebookLMSteps() {
  return request<NotebookLMStep[]>("/api/notebooklm/projects/steps");
}

export function saveNotebookLMSteps(steps: NotebookLMStep[]) {
  return request<NotebookLMStep[]>("/api/notebooklm/projects/steps", {
    method: "POST",
    body: JSON.stringify({ steps }),
  });
}

export function runNotebookLMStep(projectName: string, step: string) {
  return request<NotebookLMStepRunStatus>("/api/notebooklm/projects/steps/run", {
    method: "POST",
    body: JSON.stringify({ projectName, step }),
  });
}

export function getNotebookLMStepRunStatus(projectName: string) {
  const params = new URLSearchParams({ projectName });
  return request<NotebookLMStepRunStatus>(`/api/notebooklm/projects/steps/status?${params.toString()}`);
}

export function getNotebookLMResearchStatus(projectName: string) {
  const params = new URLSearchParams({ projectName });
  return request<NotebookLMResearchStatus>(`/api/notebooklm/projects/research-status?${params.toString()}`);
}

export function getNotebookLMProjectSources(projectName: string) {
  const params = new URLSearchParams({ projectName });
  return request<NotebookLMProjectSourcesResult>(`/api/notebooklm/projects/sources?${params.toString()}`);
}

export function getNotebookLMProjectSummary(projectName: string) {
  const params = new URLSearchParams({ projectName });
  return request<NotebookLMProjectSummary>(`/api/notebooklm/projects/summary?${params.toString()}`);
}

export function getNotebookLMProjectSourceContent(projectName: string, sourceId: string) {
  const params = new URLSearchParams({ projectName, sourceId });
  return request<NotebookLMProjectSourceContent>(`/api/notebooklm/projects/sources/content?${params.toString()}`);
}

export function updateNotebookLMProjectSourceSelection(projectName: string, selectedSourceIds: string[]) {
  return request<NotebookLMProjectSourcesResult>("/api/notebooklm/projects/sources/selection", {
    method: "POST",
    body: JSON.stringify({ projectName, selectedSourceIds }),
  });
}

export async function startNotebookLMLogin(accountEmail: string) {
  const response = await fetch("/api/notebooklm/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountEmail }),
  });

  const responseText = await response.text();
  let body: ApiResponse<null>;

  try {
    body = JSON.parse(responseText) as ApiResponse<null>;
  } catch {
    throw new Error(`서버 응답을 처리할 수 없습니다. (HTTP ${response.status})`);
  }

  if (response.status !== 202 || !body.success) {
    throw new Error(body.message || "NotebookLM 연동 시작에 실패했습니다.");
  }
}

export async function importNotebookLMAuth(masterToken: File, storageState: File) {
  const formData = new FormData();
  formData.append("masterToken", masterToken);
  formData.append("storageState", storageState);

  const response = await fetch("/api/notebooklm/auth/import", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const responseText = await response.text();
  let body: ApiResponse<null>;

  try {
    body = JSON.parse(responseText) as ApiResponse<null>;
  } catch {
    throw new Error(`서버 응답을 처리할 수 없습니다. (HTTP ${response.status})`);
  }

  if (!response.ok || !body.success) {
    throw new Error(body.message || "인증 파일 업로드에 실패했습니다.");
  }
}
