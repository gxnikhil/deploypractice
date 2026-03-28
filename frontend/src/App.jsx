import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { FileText, Sparkles, TrendingUp, Zap, Award, Target, UploadCloud, CheckCircle, AlertCircle, Lock, Download } from 'lucide-react';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ANALYSIS_STAGES = [
  { label: 'Parsing PDF', icon: '📄' },
  { label: 'Extracting skills', icon: '🔍' },
  { label: 'Matching JD', icon: '🎯' },
  { label: 'Finishing up', icon: '✅' },
];

function useHoverSound() {
  return () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch(e) {}
  };
}

function Card3D({ children, className, icon: Icon, delay = 0 }) {
  const ref = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const playSound = useHoverSound();
  
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 300, damping: 30 });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: -20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, type: "spring", stiffness: 100 }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
        mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      onMouseEnter={playSound}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={cn("group relative rounded-2xl border-2 border-blue-200 bg-white/80 p-8 backdrop-blur-xl hover:border-blue-300 hover:shadow-2xl transition-all duration-300", className)}
    >
      <motion.div style={{ transform: "translateZ(50px)" }} className="relative z-10">
        <motion.div 
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 shadow-lg"
          whileHover={{ scale: 1.1, rotate: 360 }} transition={{ duration: 0.6 }}
        >
          <Icon className="h-8 w-8 text-white" />
        </motion.div>
        {children}
      </motion.div>
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-400/30 via-sky-400/30 to-cyan-400/30 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}

function TopNavbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-900 tracking-tight">
          <Sparkles className="h-6 w-6 text-blue-500" />
          SkillSync AI
        </div>
        <div className="hidden space-x-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#" className="hover:text-blue-600 transition">Resume Check</a>
          <a href="#" className="hover:text-blue-600 transition">Cover Letter</a>
          <a href="#" className="hover:text-blue-600 transition">Pricing</a>
        </div>
        <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-full px-6">Get Started</Button>
      </div>
    </nav>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  
  const [showPremiumOptions, setShowPremiumOptions] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [premiumLoading, setPremiumLoading] = useState(false);

  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);
  
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const playSound = useHoverSound();

  const handleAnalyze = async () => {
    if (!file || !jobDescription.trim()) { setError('Upload a resume & paste a job description.'); return; }
    setLoading(true); setError(''); setResult(null);
    const fd = new FormData(); fd.append('resume', file); fd.append('job_description', jobDescription);
    try {
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Server Error (${res.status})`);
      const data = await res.json();
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err) { setError(err.message || 'Connection failed.'); }
    setLoading(false);
  };

  const handlePremium = async () => {
    setPremiumLoading(true);
    const fd = new FormData(); fd.append('resume', file); fd.append('job_description', jobDescription);
    try {
      const res = await fetch(`${API_URL}/api/premium`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Premium processing failed');
      const data = await res.json();
      setTailoredResume(data.tailored_resume || '');
      setCoverLetter(data.cover_letter || '');
    } catch (e) { setError(e.message); }
    setPremiumLoading(false);
  };

  const downloadPDF = (id, fname) => {
    const el = document.getElementById(id);
    if (!el) return;
    html2pdf().set({ margin: 0.5, filename: fname, jsPDF: { unit: 'in', format: 'letter' } }).from(el).save();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      <TopNavbar />
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, -100, 0] }} transition={{ duration: 20, repeat: Infinity }} className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-sky-200/50 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, -150, 0], y: [0, 100, 0] }} transition={{ duration: 25, repeat: Infinity }} className="absolute top-1/4 right-0 h-[500px] w-[500px] rounded-full bg-blue-200/40 blur-[120px]" />
      </div>

      <main className="relative z-10 pt-32 pb-24 px-6 md:pt-40">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> Powered by Advanced AI
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, scale: 0.9, rotateX: -20 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ duration: 0.8, type: "spring" }} className="mt-8 text-5xl font-black tracking-tight text-slate-900 md:text-7xl">
            <span className="bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">AI Resume Analyzer</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Get instant actionable feedback on your resume. Optimize for ATS systems, highlight missing skills, and land your dream job faster.
          </motion.p>
        </div>

        {/* UPLOAD SECTION */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mx-auto mt-16 max-w-4xl rounded-3xl border border-white/40 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">1. Upload your Resume (PDF)</label>
              <div 
                className={cn("group relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all", file ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50")}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                    {file ? <CheckCircle className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                  </div>
                  <p className="font-semibold text-slate-700">{file ? file.name : "Click to upload"}</p>
                  <p className="mt-1 text-xs text-slate-500">Max 2MB. PDF format.</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">2. Target Job Description</label>
              <textarea 
                value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the requirements of the job you want to apply for..."
                className="h-48 w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm transiton-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-inner"
              />
            </div>
          </div>
          
          {error && <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100"><AlertCircle className="h-4 w-4"/> {error}</div>}
          
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={handleAnalyze} disabled={loading || !file || !jobDescription} onMouseEnter={playSound} className="h-14 w-full max-w-md rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-lg font-bold shadow-xl shadow-blue-500/20 hover:scale-105 hover:shadow-2xl transition-all">
              {loading ? <span className="flex items-center gap-2"><div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Analyzing...</span> : <span className="flex items-center gap-2">Scan Resume <Zap className="h-5 w-5"/></span>}
            </Button>
          </div>
        </motion.div>

        {/* HIGHLIGHTS SECTION (Visible before analyzing) */}
        {!result && !loading && (
          <div className="mt-24 grid gap-8 sm:grid-cols-3 max-w-5xl mx-auto">
            <Card3D icon={TrendingUp} delay={0.1}>
              <h3 className="mt-6 text-xl font-bold text-slate-800">ATS Optimization</h3>
              <p className="mt-3 text-sm text-slate-600">Ensure your resume passes applicant tracking systems with precision analysis.</p>
            </Card3D>
            <Card3D icon={Award} delay={0.2}>
              <h3 className="mt-6 text-xl font-bold text-slate-800">Smart Suggestions</h3>
              <p className="mt-3 text-sm text-slate-600">Get AI-powered recommendations to improve your content and stand out.</p>
            </Card3D>
            <Card3D icon={Target} delay={0.3}>
              <h3 className="mt-6 text-xl font-bold text-slate-800">Instant Alignment</h3>
              <p className="mt-3 text-sm text-slate-600">Match your experience perfectly against any job description in seconds.</p>
            </Card3D>
          </div>
        )}

        {/* RESULTS SECTION */}
        {result && (
          <motion.div ref={resultsRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto mt-24 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-900">Analysis Complete.</h2>
              <p className="mt-2 text-slate-600">Here's how well your resume matches the job description.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="md:col-span-1 rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] text-center flex flex-col items-center justify-center">
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-slate-50 shadow-inner">
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle cx="96" cy="96" r="88" fill="none" strokeWidth="12" className="stroke-slate-100" />
                    <circle cx="96" cy="96" r="88" fill="none" strokeWidth="12" strokeDasharray="553" strokeDashoffset={553 - (result.score / 100) * 553} className="stroke-blue-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-5xl font-black text-blue-600">{result.score}<span className="text-2xl text-slate-400 font-medium">%</span></div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-800">Match Score</h3>
                <p className="mt-2 text-sm text-slate-500">Your resume is a {result.score >= 80 ? 'strong' : result.score >= 60 ? 'fair' : 'weak'} match.</p>
              </div>
              
              <div className="md:col-span-2 rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)]">
                <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800"><FileText className="h-6 w-6 text-blue-500"/> Executive Summary</h3>
                <p className="mt-4 text-slate-600 leading-relaxed">{result.summary}</p>
                
                <h3 className="mt-8 text-xl font-bold text-slate-800 border-t border-slate-100 pt-6">Skill Breakdown</h3>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {Object.entries(result.breakdown).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                        <span className="capitalize">{key.replace('_', ' ')}</span>
                        <span className="text-blue-600">{val}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${val}%` }}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="rounded-3xl bg-red-50/50 p-8 border border-red-100 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-red-700"><AlertCircle className="h-5 w-5"/> Areas of Concern</h3>
                <ul className="mt-4 space-y-3">
                  {result.areas_of_concern?.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-red-900"><span className="mt-0.5 min-w-[12px]">•</span> <span>{item}</span></li>)}
                </ul>
              </div>
              <div className="rounded-3xl bg-emerald-50/50 p-8 border border-emerald-100 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-700"><Target className="h-5 w-5"/> Prep Tips</h3>
                <ul className="mt-4 space-y-3">
                  {result.preparation_tips?.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-emerald-900"><span className="mt-0.5 min-w-[12px]">•</span> <span>{item}</span></li>)}
                </ul>
              </div>
            </div>

            {/* PREMIUM CALL TO ACTION */}
            {!showPremiumOptions && (
              <div className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-10 text-center shadow-2xl relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10">
                  <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-300">Unlock Pro Suite</span>
                  <h3 className="mt-4 text-3xl font-black text-white">Let AI rewrite it for you.</h3>
                  <p className="mx-auto mt-4 max-w-xl text-slate-300">Generate a perfectly tailored cover letter and a rewritten resume maximizing your chances of passing ATS systems.</p>
                  <Button size="lg" onClick={() => { setShowPremiumOptions(true); handlePremium(); }} className="mt-8 h-12 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg text-lg font-bold px-8">
                    <Lock className="mr-2 h-5 w-5"/> Unlock Now
                  </Button>
                </div>
              </div>
            )}
            
            {showPremiumOptions && (
              <div className="mt-12 space-y-8">
                {premiumLoading ? (
                  <div className="flex flex-col items-center py-12 text-slate-500">
                    <div className="analyzing-ring mb-4 border-blue-200 border-l-blue-600 border-t-blue-600"/>
                    <p className="font-medium animate-pulse">Crafting your tailored documents...</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-3xl font-black text-slate-900 mt-16 text-center">Your Pro Documents</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      {tailoredResume && (
                        <div className="rounded-3xl bg-white shadow-lg p-6 flex flex-col h-[600px]">
                          <div className="flex items-center justify-between mb-4 border-b pb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500"/> Tailored Resume</h3>
                            <Button size="sm" variant="outline" onClick={() => downloadPDF('resume-doc', 'Optimized_Resume.pdf')} className="rounded-full shadow-sm">
                              <Download className="mr-2 h-4 w-4"/> PDF
                            </Button>
                          </div>
                          <div id="resume-doc" className="prose prose-sm xl:prose-base overflow-y-auto pr-2 custom-scroll flex-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(tailoredResume)) }} />
                        </div>
                      )}
                      {coverLetter && (
                        <div className="rounded-3xl bg-white shadow-lg p-6 flex flex-col h-[600px]">
                          <div className="flex items-center justify-between mb-4 border-b pb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><FileText className="h-5 w-5 text-purple-500"/> Cover Letter</h3>
                            <Button size="sm" variant="outline" onClick={() => downloadPDF('cover-doc', 'Cover_Letter.pdf')} className="rounded-full shadow-sm">
                              <Download className="mr-2 h-4 w-4"/> PDF
                            </Button>
                          </div>
                          <div id="cover-doc" className="prose prose-sm xl:prose-base overflow-y-auto pr-2 custom-scroll flex-1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(coverLetter)) }} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>
      
      <footer className="relative z-10 border-t border-slate-200 bg-white py-8 mt-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 font-bold text-slate-800"><Sparkles className="h-5 w-5 text-blue-500" /> SkillSync AI</div>
          <p className="text-sm text-slate-500">© 2026 Designed for performance.</p>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .prose h1, .prose h2, .prose h3 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
        .prose ul { padding-left: 1.5em; list-style-type: disc; }
        .prose p { margin-bottom: 1em; color: #475569; }
      `}} />
    </div>
  );
}
