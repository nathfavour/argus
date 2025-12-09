export enum ReportStatus {
  UNVERIFIED = 'Unverified',
  VERIFIED = 'Verified',
  SPAM = 'Spam'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface EncryptedPayload {
  // In a real implementation using TEN protocol, this would be the TEE encrypted blob
  ciphertext: string; 
  iv: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video';
  url: string; // Base64 Data URI for MVP
  mimeType: string;
}

export interface Report {
  id: string; // Hash
  timestamp: number;
  reporterId: string; // Pseudo-anonymous ID
  location: GeoLocation;
  content: string; // Decrypted content (only available after decryption)
  status: ReportStatus;
  isEncrypted: boolean;
  attachments?: Attachment[];
}

export interface ReportSubmission {
  content: string;
  location: GeoLocation | null;
  attachments?: Attachment[];
}

export type ViewState = 'landing' | 'reporter' | 'verifier';
export type VerifierTab = 'list' | 'map';