import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { connectLiveSession } from '../../lib/gemini';
import { decodePcmAudioData, base64ToPcm } from '../../lib/audio';

export const LiveIntakeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isTalking, setIsTalking] = useState(false);
  const sessionCleanerRef = useRef<() => void>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const session = await connectLiveSession(
          async (msg) => {
            if (!mounted) return;
            
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              setIsTalking(true);
              const ctx = audioContextRef.current;
              const pcmData = base64ToPcm(base64Audio);
              const audioBuffer = await decodePcmAudioData(pcmData, ctx, 24000, 1);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              const currentTime = ctx.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              
              source.onended = () => {
                 if (ctx.currentTime >= nextStartTimeRef.current) {
                    setIsTalking(false);
                 }
              };
            }
          },
          () => setStatus('connected'),
          () => console.log('Session closed'),
          (err) => setStatus('error')
        );

        sessionCleanerRef.current = session.close;

      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };

    init();

    return () => {
      mounted = false;
      if (sessionCleanerRef.current) sessionCleanerRef.current();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-950 w-full max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="mb-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
            status === 'connected' 
              ? isTalking 
                ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-110' 
                : 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
              : 'bg-slate-200 dark:bg-slate-800 animate-pulse'
          }`}>
            <i className={`fas fa-microphone text-4xl ${status === 'connected' ? (isTalking ? 'text-white' : 'text-emerald-600') : 'text-slate-400'}`}></i>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Live Intake Mode</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
          {status === 'connecting' && "Establishing secure line..."}
          {status === 'connected' && "Listening. Speak naturally to report the incident."}
          {status === 'error' && "Connection failed. Please verify microphone permissions."}
        </p>

        <div className="w-full flex justify-center">
          <Button variant="danger" onClick={onClose} className="px-8">
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
};