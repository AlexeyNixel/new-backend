export interface OldFile {
  id: string;
  originalName: string;
  mimeType: string;
  hash: string;
  type: 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'ARCHIVE' | 'OTHER';
  path: string;
  preview: string;
  createdAt: string;
}

// enum FileType {}
