import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Award,
  Linkedin,
  Sparkles,
  QrCode,
  XCircle,
  ShieldCheck,
  ArrowLeft
} from "lucide-react";

/* ---------------- CONFIGURATION ---------------- */
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSujpfz4G0XtIuuQipAIu3Jp8EEs7KCKFasqVtTWMdyYarCfatOTAk3HbujOQ3PNvne3HiztYAkJUZ9/pub?output=csv"; 
const TEMPLATE_URL = "template.png"; 

const LINKEDIN_CONFIG = {
  orgId: "YOUR_ORG_ID",
  certName: "Google StudyJam Certificate", 
  orgName: "StudyJam Community",
};

/* ---------------- UTILS ---------------- */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return headers.reduce((obj, key, i) => {
      obj[key] = values[i];
      return obj;
    }, {});
  });
}

/* ---------------- CANVAS GENERATOR ---------------- */
async function generateCertificate(name, participantId) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // 1. Load Background Template
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = TEMPLATE_URL;

  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error("Failed to load certificate template."));
  });

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  // 2. Draw Participant Name 
  const nameYPosition = canvas.height * 0.42; 
  const fontSize = Math.floor(canvas.height * 0.05); 
  
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = "#202124";
  ctx.textAlign = "center";
  ctx.fillText(name, canvas.width / 3.5, nameYPosition);

  // 3. Draw QR Code 
  try {
    const domain = window.location.origin;
    // Changed to ?verify= to support static hosting seamlessly, but we parse both.
    const verificationUrl = `${domain}/?verify=${participantId}`;
    
    const qrSize = Math.floor(canvas.width * 0.095); 
    const qrX = canvas.width * 0.335;  
    const qrY = canvas.height * 0.80; 
    
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(verificationUrl)}&margin=1`;
    
    const qrImg = new Image();
    qrImg.crossOrigin = "Anonymous"; 
    qrImg.src = qrApiUrl;
    
    await new Promise((res, rej) => {
      qrImg.onload = res;
      qrImg.onerror = rej;
    });

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (err) {
    console.error("Error generating or drawing QR:", err);
  }

  return canvas.toDataURL("image/png");
}

/* ---------------- MAIN COMPONENT ---------------- */
export default function App() {
  // Main Search State
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Verification State
  const [isVerifyRoute, setIsVerifyRoute] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState("loading"); // loading, success, failed
  const [verifyData, setVerifyData] = useState(null);
  const [verifyIdQuery, setVerifyIdQuery] = useState("");

  // Check URL for verification routes on load
  useEffect(() => {
    // Ensures the app takes absolute full screen by removing body margins
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";

    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    let idToVerify = null;

    // Support both /verify/ID and ?verify=ID
    if (path.includes("/verify/")) {
      idToVerify = path.split("/verify/")[1].replace(/\//g, "");
    } else if (searchParams.has("verify")) {
      idToVerify = searchParams.get("verify");
    }

    if (idToVerify) {
      setIsVerifyRoute(true);
      setVerifyIdQuery(idToVerify);
      runVerification(idToVerify);
    }
  }, []);

  const runVerification = async (id) => {
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("Network error fetching database.");
      
      const text = await res.text();
      const records = parseCSV(text);

      const record = records.find(
        (r) => 
          r.id === id.trim() || 
          r.booking_id === id.trim()
      );

      if (!record) {
        setVerifyStatus("failed");
        return;
      }

      const participantName = record.name || record.full_name || "Participant";
      const imageUrl = await generateCertificate(participantName, id);

      setVerifyData({
        name: participantName,
        participantId: id,
        url: imageUrl
      });
      setVerifyStatus("success");

    } catch (err) {
      console.error(err);
      setVerifyStatus("failed");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("Failed to fetch participant data from the server.");

      const text = await res.text();
      const records = parseCSV(text);

      const record = records.find(
        (r) => 
          r.id === searchId.trim() || 
          r.booking_id === searchId.trim() || 
          r.email === searchId.trim()
      );

      if (!record) {
        throw new Error("Participant not found. Please check your ID or Email.");
      }

      const participantName = record.name || record.full_name || "Participant";
      const participantIdentifier = record.id || record.booking_id || searchId;

      const imageUrl = await generateCertificate(
        participantName,
        participantIdentifier
      );

      setResult({
        name: participantName,
        url: imageUrl,
        participantId: participantIdentifier,
        fileName: `StudyJam_Certificate_${participantName.replace(/\s+/g, "_")}.png`,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInClick = () => {
    if (!result) return;
    const domain = window.location.origin;
    const verificationUrl = `${domain}/?verify=${result.participantId}`;
    const date = new Date();
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: LINKEDIN_CONFIG.certName,
      organizationId: LINKEDIN_CONFIG.orgId,
      organizationName: LINKEDIN_CONFIG.orgName,
      issueYear: date.getFullYear().toString(),
      issueMonth: (date.getMonth() + 1).toString(),
      certId: result.participantId,
      certUrl: verificationUrl,
    });
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank");
  };

  // ---------------------------------------------------------------------------
  // RENDER: VERIFICATION VIEW (When accessed via QR Code)
  // ---------------------------------------------------------------------------
  if (isVerifyRoute) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-[#070b19] font-sans text-white overflow-hidden flex flex-col items-center justify-center p-4 m-0 absolute inset-0">
        {/* Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full bg-cyan-600/20 blur-[100px] sm:blur-[140px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full bg-purple-600/20 blur-[100px] sm:blur-[140px]" />
        </div>

        <div className="relative z-10 w-full max-w-md backdrop-blur-2xl bg-slate-900/50 border border-white/[0.08] p-8 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          
          {verifyStatus === "loading" && (
            <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Verifying Record...</h2>
                <p className="text-slate-400">Checking the official database for ID: <span className="text-white font-mono">{verifyIdQuery}</span></p>
              </div>
            </div>
          )}

          {verifyStatus === "success" && verifyData && (
            <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <ShieldCheck className="w-12 h-12 text-emerald-400" />
              </div>
              
              <div className="w-full">
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Official Credential</h2>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400 tracking-wide">Verified Authentic</span>
                </div>
                
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-left space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Awarded To</p>
                    <p className="text-xl font-bold text-white">{verifyData.name}</p>
                  </div>
                  <div className="h-px w-full bg-white/[0.05]"></div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Certificate ID</p>
                    <p className="text-md font-mono text-cyan-400">{verifyData.participantId}</p>
                  </div>
                  <div className="h-px w-full bg-white/[0.05]"></div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Issued By</p>
                    <p className="text-md font-medium text-white">{LINKEDIN_CONFIG.orgName}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsVerifyRoute(false)}
                  className="mt-8 text-slate-400 hover:text-white flex items-center justify-center gap-2 w-full transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Go to Home
                </button>
              </div>
            </div>
          )}

          {verifyStatus === "failed" && (
            <div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              
              <div>
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Record Not Found</h2>
                <p className="text-red-400 font-medium mb-6">This certificate ID could not be verified.</p>
                
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-left">
                  <p className="text-sm text-slate-300">
                    The requested ID (<span className="font-mono text-white">{verifyIdQuery}</span>) does not match any official records in the {LINKEDIN_CONFIG.orgName} database.
                  </p>
                </div>

                <button 
                  onClick={() => setIsVerifyRoute(false)}
                  className="mt-8 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all w-full flex justify-center items-center gap-2"
                >
                  <Search className="w-4 h-4" /> Search Again
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: DEFAULT GENERATOR VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="relative min-h-[100dvh] w-full bg-[#070b19] font-sans selection:bg-cyan-500/30 text-white overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8 m-0 absolute inset-0">
      
      {/* --- GLASSMORPHISM BACKGROUND BLOBS --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full bg-cyan-600/20 blur-[100px] sm:blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full bg-purple-600/20 blur-[100px] sm:blur-[140px]" />
        <div className="absolute top-[30%] left-[50%] translate-x-[-50%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      {/* --- MAIN GLASS CONTAINER --- */}
      <div className="relative z-10 w-full max-w-5xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] p-6 sm:p-12 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Side: Hero Text */}
          <div className="text-center lg:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-full backdrop-blur-md shadow-inner cursor-default hover:bg-white/[0.08] transition-colors">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-100 tracking-wide">
                Certificates Now Available
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Claim Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
                StudyJam Credential
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
              Congratulations on completing the StudyJam! Enter your Participant ID or Email below to generate and securely download your official certificate.
            </p>
          </div>

          {/* Right Side: Interactive Section */}
          <div className="relative">
            {/* Soft inner glow behind the card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 rounded-3xl blur-xl" />
            
            <div className="relative backdrop-blur-xl bg-slate-900/40 border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl min-h-[400px] flex flex-col justify-center">
              {!result ? (
                /* --- SEARCH FORM --- */
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="text-center space-y-2 mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-lg">
                      <Award className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                      Find Your Record
                    </h2>
                    <p className="text-slate-400 text-sm">
                      Use the ID provided to you during registration
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <input
                        id="searchId"
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="block w-full px-5 py-4 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all duration-300"
                        placeholder="Enter Participant ID or Email"
                        required
                      />
                    </div>

                    <button
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>Retrieve Certificate</span>
                          <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-400 text-sm animate-in fade-in zoom-in duration-300">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                  )}
                </form>
              ) : (
                /* --- RESULT DISPLAY --- */
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 py-3 px-4 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold text-sm tracking-wide">
                      Certificate Ready
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group">
                    <img
                      src={result.url}
                      alt={`${result.name}'s Certificate`}
                      className="w-full object-contain max-h-[350px] bg-black/50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                      <QrCode className="w-6 h-6 text-white/70" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <a
                      href={result.url}
                      download={result.fileName}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium backdrop-blur-md transition-all duration-300"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>

                    <button
                      onClick={handleLinkedInClick}
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#0a66c2]/80 hover:bg-[#0a66c2] border border-[#0a66c2]/50 text-white font-medium backdrop-blur-md transition-all duration-300 shadow-[0_0_15px_rgba(10,102,194,0.4)]"
                    >
                      <Linkedin className="w-4 h-4" />
                      Add to Profile
                    </button>

                    <button
                      onClick={() => setResult(null)}
                      className="col-span-1 sm:col-span-2 px-4 py-3 mt-2 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-400 hover:text-white font-medium transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Search className="w-4 h-4" /> Search Another ID
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}