export type GoogleDriveStatus = {
  available: boolean;
  sharedDriveConfigured: boolean;
  sharedDriveId: string;
  rootFolderId: string;
};

export type GoogleDriveBreadcrumb = {
  id: string;
  name: string;
};

export type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  folder: boolean;
  webViewLink: string | null;
  parentId: string | null;
};

export type GoogleDriveList = {
  currentFolderId: string;
  currentFolderName: string;
  parentFolderId: string | null;
  breadcrumbs: GoogleDriveBreadcrumb[];
  files: GoogleDriveFile[];
};
