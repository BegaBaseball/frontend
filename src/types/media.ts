export type MediaDomain = 'PROFILE' | 'DIARY' | 'CHEER' | 'CHAT';

export interface InitMediaUploadRequest {
  domain: MediaDomain;
  fileName: string;
  contentType: string;
  contentLength: number;
  width: number;
  height: number;
}

export interface InitMediaUploadResponse {
  assetId: number;
  uploadUrl: string;
  stagingObjectKey: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface FinalizeMediaUploadResponse {
  assetId: number;
  storagePath: string;
  publicUrl: string;
}
