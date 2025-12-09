import React, { useState, useEffect } from "react";
import { APP_NAME, APP_VERSION } from "./constants";
import { ViewState } from "./types";
import { Button } from "./components/ui/Button";
import { ReporterView } from "./components/reporter/ReporterView";
import { VerifierDashboard } from "./components/verifier/VerifierDashboard";
import { ChatWidget } from "./components/ui/ChatWidget";

function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  
  // Initialize theme from local storage or system preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("argus_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true; // Default to dark if undefined
  });

  // Apply theme to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      localStorage.setItem("argus_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("argus_theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleConnectWallet = async () => {
    setIsWalletConnecting(true);
    // Simulate wallet connection delay
    setTimeout(() => {
      setIsWalletConnecting(false);
      setView("verifier");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-300">
      {/* Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setView('landing')}>
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-emerald-500/20">
                <i className="fas fa-shield-halved text-white text-sm"></i>
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">{APP_NAME}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors focus:outline-none"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
              </button>
              <div className="text-xs text-slate-500 font-mono hidden sm:block">v{APP_VERSION}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Content Body */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {view === "landing" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-12">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-emerald-600 dark:text-emerald-400 mb-4 animate-pulse-slow">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2"></span>
                Secure • Decentralized • Anonymous
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white animate-slide-up opacity-0 [animation-delay:0ms]">
                Local Intelligence, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-500">
                  Cryptographically Verified.
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto animate-slide-up opacity-0 [animation-delay:200ms]">
                Securely report security threats in your region without revealing your identity. Powered by TEN Protocol for absolute privacy.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 w-full max-w-lg animate-slide-up opacity-0 [animation-delay:400ms]">
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur"></div>
                <Button 
                  onClick={() => setView("reporter")} 
                  variant="custom"
                  className="relative w-full h-full py-6 text-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <div className="flex flex-col items-center">
                    <i className="fas fa-bullhorn mb-2 text-2xl text-emerald-500"></i>
                    <span>Submit Report</span>
                    <span className="text-xs text-slate-500 font-normal mt-1">No Login Required</span>
                  </div>
                </Button>
              </div>

              <div className="group relative">
                <Button 
                  onClick={handleConnectWallet} 
                  variant="custom"
                  isLoading={isWalletConnecting}
                  className="w-full h-full py-6 text-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <div className="flex flex-col items-center">
                    <i className="fas fa-fingerprint mb-2 text-2xl text-slate-400"></i>
                    <span>Verifier Access</span>
                    <span className="text-xs text-slate-500 font-normal mt-1">Connect Wallet</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}

        {view === "reporter" && (
          <ReporterView onBack={() => setView("landing")} />
        )}

        {view === "verifier" && (
          <VerifierDashboard onLogout={() => setView("landing")} isDarkMode={isDarkMode} />
        )}
      </main>

      {/* Global AI Chatbot */}
      <ChatWidget />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-8">
         <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
           <p>&copy; {new Date().getFullYear()} {APP_NAME}. Built on TEN Protocol.</p>
         </div>
      </footer>
    </div>
  );
}

export default App;