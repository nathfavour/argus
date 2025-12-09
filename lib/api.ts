import { Report, ReportStatus, ReportSubmission } from "../types";
import { encryptReport, generateReportHash } from "./crypto";

// Mock In-Memory Store for MVP Demo
let MOCK_REPORTS: Report[] = [
  {
    id: "0x8f2a...9b1c",
    timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
    reporterId: "anon_821",
    location: { latitude: 9.0820, longitude: 8.6753, accuracy: 10 }, // Central Nigeria approx
    content: "Suspicious movement of unmarked trucks near the the abandoned factory.",
    status: ReportStatus.UNVERIFIED,
    isEncrypted: true,
    attachments: [
      {
        id: "att_1",
        type: "image",
        mimeType: "image/jpeg",
        url: "https://picsum.photos/seed/trucks/400/300" // Placeholder
      }
    ]
  },
  {
    id: "0x3d1...882a",
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    reporterId: "anon_102",
    location: { latitude: 9.0600, longitude: 8.6500, accuracy: 25 }, 
    content: "Loud noises resembling gunfire heard from the eastern ridge.",
    status: ReportStatus.VERIFIED,
    isEncrypted: true,
    attachments: []
  }
];

export const submitReport = async (submission: ReportSubmission): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const timestamp = Date.now();
  
  // 1. Encrypt Payload (Future: TEN Protocol)
  await encryptReport(submission.content);
  
  // 2. Generate Hash (Future: On-Chain ID)
  const reportHash = await generateReportHash(submission.content, timestamp);

  const newReport: Report = {
    id: reportHash.substring(0, 10) + "...",
    timestamp,
    reporterId: `anon_${Math.floor(Math.random() * 9999)}`,
    location: submission.location || { latitude: 0, longitude: 0, accuracy: 0 },
    content: submission.content,
    status: ReportStatus.UNVERIFIED,
    isEncrypted: true,
    attachments: submission.attachments || []
  };

  MOCK_REPORTS.unshift(newReport);
  return newReport.id;
};

export const fetchReports = async (): Promise<Report[]> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return [...MOCK_REPORTS];
};

export const updateReportStatus = async (reportId: string, status: ReportStatus): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  MOCK_REPORTS = MOCK_REPORTS.map(r => r.id === reportId ? { ...r, status } : r);
};