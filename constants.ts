import { ReportStatus } from "./types";

export const APP_NAME = "Argus";
export const APP_VERSION = "0.1.0-alpha";

export const MAX_REPORT_LENGTH = 500;

export const STATUS_COLORS: Record<ReportStatus, string> = {
  [ReportStatus.UNVERIFIED]: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  [ReportStatus.VERIFIED]: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  [ReportStatus.SPAM]: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const MOCK_WALLET_ADDRESS = "0x71C...9A23";

// Placeholder for future Appwrite Config
export const APPWRITE_CONFIG = {
  ENDPOINT: process.env.APPWRITE_ENDPOINT || "",
  PROJECT_ID: process.env.APPWRITE_PROJECT_ID || "",
  DB_ID: "argus_db",
  COLLECTION_ID: "reports",
};