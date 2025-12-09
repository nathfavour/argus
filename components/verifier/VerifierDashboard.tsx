import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/Button";
import { fetchReports, updateReportStatus } from "../../lib/api";
import { generateSpeech, analyzeLocation } from "../../lib/gemini";
import { base64ToPcm, decodePcmAudioData } from "../../lib/audio";
import { Report, ReportStatus, VerifierTab } from "../../types";
import { STATUS_COLORS, MOCK_WALLET_ADDRESS } from "../../constants";
import { MapView } from "./MapView";

export const VerifierDashboard: React.FC<{ onLogout: () => void, isDarkMode: boolean }> = ({ onLogout, isDarkMode }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<VerifierTab>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{text: string, chunks: any[]} | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    const data = await fetchReports();
    setReports(data);
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    await updateReportStatus(id, newStatus);
  };

  const handleAnalyzeLocation = async (lat: number, lng: number) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeLocation(lat, lng);
      setAnalysisResult(result);
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReadAloud = async (text: string) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const pcmData = base64ToPcm(base64Audio);
        const buffer = await decodePcmAudioData(pcmData, audioContextRef.current, 24000);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setIsPlayingAudio(false);
        source.start();
      } else {
        setIsPlayingAudio(false);
      }
    } catch (e) {
      console.error(e);
      setIsPlayingAudio(false);
    }
  };

  // Reset analysis when selecting new report
  useEffect(() => {
    setAnalysisResult(null);
  }, [selectedReportId]);

  const selectedReport = reports.find(r => r.id === selectedReportId);

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4 transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <i className="fas fa-eye text-emerald-500 mr-3"></i>
            Verifier Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connected: <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/30">{MOCK_WALLET_ADDRESS}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex transition-colors duration-300">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <i className="fas fa-list mr-2"></i>List
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <i className="fas fa-map mr-2"></i>Intel Map
            </button>
          </div>
          <Button variant="secondary" onClick={onLogout} className="!py-2">
            Disconnect
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mt-6 relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin text-emerald-500 text-4xl"><i className="fas fa-circle-notch"></i></div>
          </div>
        ) : activeTab === 'map' ? (
           <div className="h-[600px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0 transition-colors duration-300">
             <MapView reports={reports} onSelectReport={setSelectedReportId} isDarkMode={isDarkMode} />
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List Column */}
            <div className="space-y-4">
              {reports.map(report => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedReportId === report.id ? 'bg-slate-50 dark:bg-slate-800 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(report.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                     <h3 className="text-slate-800 dark:text-slate-200 text-sm font-medium line-clamp-2">{report.content || "Media Only Report"}</h3>
                     {report.attachments && report.attachments.length > 0 && (
                        <i className="fas fa-paperclip text-slate-400 text-xs"></i>
                     )}
                  </div>
                  <div className="mt-3 flex items-center text-xs text-slate-500">
                    <i className="fas fa-map-marker-alt mr-2"></i>
                    {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail Column (Sticky) */}
            <div className="hidden lg:block">
              {selectedReport ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sticky top-4 transition-colors duration-300 shadow-sm max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Report Analysis</h2>
                      <p className="font-mono text-xs text-slate-500">Hash: {selectedReport.id}</p>
                    </div>
                    {/* Status Actions */}
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleStatusChange(selectedReport.id, ReportStatus.VERIFIED)}
                        className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30"
                        title="Mark Verified"
                       >
                         <i className="fas fa-check"></i>
                       </button>
                       <button 
                        onClick={() => handleStatusChange(selectedReport.id, ReportStatus.SPAM)}
                        className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center border border-red-200 dark:border-red-500/30"
                        title="Mark Spam"
                       >
                         <i className="fas fa-times"></i>
                       </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     {/* Media Gallery */}
                     {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {selectedReport.attachments.map(att => (
                            <div key={att.id} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                              {att.type === 'image' ? (
                                <img src={att.url} alt="Proof" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              ) : (
                                <video src={att.url} controls className="w-full h-full object-contain" />
                              )}
                            </div>
                          ))}
                        </div>
                     )}

                     <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 relative">
                        <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Decrypted Intelligence</label>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed pr-8">{selectedReport.content || "No text content."}</p>
                        {selectedReport.content && (
                          <button 
                            onClick={() => handleReadAloud(selectedReport.content)}
                            className={`absolute top-2 right-2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${isPlayingAudio ? 'text-emerald-500' : 'text-slate-400'}`}
                            title="Read Aloud"
                          >
                            <i className={`fas ${isPlayingAudio ? 'fa-volume-up fa-beat' : 'fa-volume-up'}`}></i>
                          </button>
                        )}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">Reporter ID</label>
                          <p className="font-mono text-sm text-slate-700 dark:text-slate-300">{selectedReport.reporterId}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">GPS Accuracy</label>
                          <p className="font-mono text-sm text-slate-700 dark:text-slate-300">±{selectedReport.location.accuracy}m</p>
                        </div>
                     </div>

                     <div className="h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 relative flex flex-col items-center justify-center">
                        {!analysisResult ? (
                          <div className="text-center p-4">
                            <p className="text-xs text-slate-500 mb-2">Coordinates: {selectedReport.location.latitude}, {selectedReport.location.longitude}</p>
                            <Button 
                              variant="secondary" 
                              onClick={() => handleAnalyzeLocation(selectedReport.location.latitude, selectedReport.location.longitude)}
                              isLoading={isAnalyzing}
                              className="text-xs py-2 px-4 h-auto"
                            >
                              <i className="fas fa-search-location mr-2"></i>
                              Analyze Context (Google Maps)
                            </Button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-white dark:bg-slate-900 p-4 overflow-y-auto">
                            <h4 className="font-bold text-xs uppercase text-emerald-500 mb-2">Location Intelligence</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{analysisResult.text}</p>
                            {analysisResult.chunks.length > 0 && (
                              <div className="space-y-1">
                                {analysisResult.chunks.map((chunk: any, i: number) => (
                                  chunk.web?.uri ? (
                                    <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="block text-xs text-blue-500 hover:underline truncate">
                                      {chunk.web.title} <i className="fas fa-external-link-alt ml-1"></i>
                                    </a>
                                  ) : null
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-600">
                  Select a report to view details
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};