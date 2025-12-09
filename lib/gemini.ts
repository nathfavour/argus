import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { blobToBase64, float32ToPcm16, pcmToBase64 } from "./audio";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. Audio Transcription ---
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type, // e.g., 'audio/webm' or 'audio/mp4'
              data: base64Audio,
            },
          },
          {
            text: "Transcribe this audio precisely. Return only the transcription.",
          },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

// --- 2. Text to Speech ---
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
};

// --- 3. Google Maps Grounding ---
export const analyzeLocation = async (latitude: number, longitude: number): Promise<{text: string, chunks: any[]}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "What key infrastructure, landmarks, or sensitive facilities are at or very near this location? Are there any schools, markets, or government buildings?",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude,
              longitude
            }
          }
        }
      },
    });
    
    return {
      text: response.text || "No analysis available.",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Maps analysis error:", error);
    throw error;
  }
};

// --- 4. Chatbot ---
export const createChatSession = () => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are Argus AI, a secure intelligence assistant. Help users understand how to submit reports, explain verification processes, or provide general safety advice. Keep answers concise and professional.',
    },
  });
};

// --- 5. Live API Connection ---
export const connectLiveSession = async (
  onMessage: (msg: LiveServerMessage) => void, 
  onOpen: () => void, 
  onClose: () => void,
  onError: (e: Error) => void
) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: onOpen,
      onmessage: onMessage,
      onclose: (e) => onClose(),
      onerror: (e) => onError(new Error("Live API Error")),
    },
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: "You are a calm, professional security intake officer for Argus. Interview the user to get a report. Ask for: 1. What happened? 2. Where? 3. When? Be brief. Do not be alarmist.",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
    },
  });

  // Setup Audio Input Stream
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    // Convert float32 to PCM16
    const pcmData = float32ToPcm16(inputData);
    const base64Data = pcmToBase64(new Uint8Array(pcmData.buffer));
    
    sessionPromise.then((session) => {
      session.sendRealtimeInput({ 
        media: { 
          mimeType: 'audio/pcm;rate=16000', 
          data: base64Data 
        } 
      });
    });
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    close: () => {
      stream.getTracks().forEach(track => track.stop());
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      sessionPromise.then(s => s.close());
    }
  };
};