import React, { useState, useRef } from "react";
import { Button } from "../ui/Button";
import { useGeolocation } from "../../hooks/useGeolocation";
import { submitReport } from "../../lib/api";
import { transcribeAudio } from "../../lib/gemini";
import { MAX_REPORT_LENGTH } from "../../constants";
import { LiveIntakeModal } from "./LiveIntakeModal";
import { Attachment } from "../../types";

export const ReporterView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [content, setContent] = useState("");
  const { location, getLocation, loading: locLoading, error: locError } = useGeolocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedHash, setSubmittedHash] = useState<string | null>(null);
  
  // Media State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Live Modal State
  const [showLiveModal, setShowLiveModal] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop()); // Stop mic
        
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          setContent(prev => (prev ? prev + " " + text : text));
        } catch (err) {
          alert("Failed to transcribe audio.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const result = reader.result as string;
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          type,
          url: result,
          mimeType: file.type
        };
        
        setAttachments(prev => [...prev, newAttachment]);
      };
      
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    if (!location) {
      alert("GPS coordinates are required for secure verification. Please acquire location first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const hash = await submitReport({ content, location, attachments });
      setSubmittedHash(hash);
    } catch (err) {
      console.error(err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showLiveModal) {
    return <LiveIntakeModal onClose={() => setShowLiveModal(false)} />;
  }

  if (submittedHash) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl text-center space-y-6 transition-colors duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <i className="fas fa-check text-2xl text-emerald-500"></i>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Securely Submitted</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Your report has been encrypted and recorded. This hash is your anonymous receipt.
          </p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 break-all font-mono text-xs text-emerald-600 dark:text-emerald-400">
          {submittedHash}
        </div>
        <Button onClick={() => {
          setSubmittedHash(null);
          setContent("");
          setAttachments([]);
        }} variant="secondary" className="w-full">
          Submit Another Report
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mr-4 transition-colors">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Report</h1>
        </div>
        <button 
          onClick={() => setShowLiveModal(true)}
          className="text-xs flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <i className="fas fa-headset"></i>
          Hands-free Mode
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Section */}
        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-start mb-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location</label>
            {location && (
              <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">
                <i className="fas fa-location-dot mr-1"></i>
                Lat: {location.latitude.toFixed(4)}, Long: {location.longitude.toFixed(4)}
              </span>
            )}
          </div>
          
          {!location ? (
            <div className="text-center py-4">
              <Button 
                type="button" 
                onClick={getLocation} 
                variant="secondary" 
                isLoading={locLoading}
                className="w-full"
              >
                <i className="fas fa-satellite-dish mr-2"></i>
                Acquire GPS Coordinates
              </Button>
              {locError && <p className="text-red-500 dark:text-red-400 text-xs mt-2">{locError}</p>}
            </div>
          ) : (
             <div className="h-32 bg-slate-100 dark:bg-slate-950 rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
               <div className="absolute inset-0 opacity-30 bg-[url('https://picsum.photos/seed/map/800/400')] bg-cover bg-center filter grayscale"></div>
               <div className="relative z-10 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-full text-xs text-slate-900 dark:text-white backdrop-blur-sm border border-slate-300 dark:border-slate-700">
                  <i className="fas fa-crosshairs mr-2 text-emerald-500"></i>
                  Signal Acquired (±{Math.round(location.accuracy)}m)
               </div>
             </div>
          )}
        </div>

        {/* Content Section */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Incident Details
          </label>
          <div className="relative group mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_REPORT_LENGTH}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[160px] resize-none"
              placeholder="Describe the activity, time, and specific threats observed..."
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-3">
               <div className="text-xs text-slate-400 dark:text-slate-500">
                {content.length}/{MAX_REPORT_LENGTH}
              </div>
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse scale-110' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400'
                }`}
                title="Hold to Record"
              >
                {isTranscribing ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-microphone"></i>
                )}
              </button>
            </div>
          </div>
          
          {/* Attachments Section */}
          <div className="space-y-3">
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*,video/*"
               capture="environment"
               onChange={handleFileSelect}
             />
             <div className="flex gap-2 overflow-x-auto pb-2">
               <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 h-20 w-20 flex flex-col items-center justify-center text-xs gap-1 border-dashed border-2"
               >
                 <i className="fas fa-camera text-lg"></i>
                 <span>Add Media</span>
               </Button>
               
               {attachments.map(att => (
                 <div key={att.id} className="relative shrink-0 h-20 w-20 rounded-lg overflow-hidden group border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                    {att.type === 'image' ? (
                      <img src={att.url} alt="attachment" className="w-full h-full object-cover" />
                    ) : (
                      <video src={att.url} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                 </div>
               ))}
             </div>
          </div>

          <p className="text-xs text-slate-500 mt-2">
            <i className="fas fa-shield-alt mr-1"></i>
            Identity protected. Media stripped of metadata.
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full py-4 text-lg font-bold shadow-emerald-900/50"
          // We allow submit if there is content OR attachments
          disabled={!content.trim() && attachments.length === 0}
          isLoading={isSubmitting}
        >
          Submit Secure Report
        </Button>
      </form>
    </div>
  );
};