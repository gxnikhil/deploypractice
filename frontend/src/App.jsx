import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2pdf from 'html2pdf.js';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ANALYSIS_STAGES = [
  { label: 'Parsing PDF content', icon: '📄' },
  { label: 'Extracting skills & experience', icon: '🔍' },
  { label: 'Matching against job description', icon: '🎯' },
  { label: 'Generating interview insights', icon: '💡' },
  { label: 'Finalizing report', icon: '✅' },
];

/* ── Animated Mesh Background ── */
function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-blob emerald" />
      <div className="mesh-blob violet" />
      <div className="mesh-blob small" />
    </div>
  );
}

/* ── Resume Mockup Card ── */
function ResumeMockup() {
  return (
    <div className="resume-mockup-card">
      <div className="mockup-header">
        <div className="mockup-avatar"></div>
        <div style={{flex:1}}>
          <div className="mockup-bar" style={{width:'70%', height:12, marginBottom:6}}></div>
          <div className="mockup-bar muted" style={{width:'50%', height:8}}></div>
        </div>
      </div>
      <div className="mockup-divider"></div>
      <div className="mockup-section-title">STRENGTHS</div>
      <div className="mockup-bar accent" style={{width:'85%'}}></div>
      <div className="mockup-bar accent" style={{width:'65%'}}></div>
      <div className="mockup-bar accent" style={{width:'75%'}}></div>
      <div className="mockup-section-title">EXPERIENCE</div>
      <div className="mockup-bar" style={{width:'90%'}}></div>
      <div className="mockup-bar" style={{width:'75%'}}></div>
      <div className="mockup-bar muted" style={{width:'60%'}}></div>
      <div className="mockup-bar muted" style={{width:'80%'}}></div>
      <div className="mockup-ai-badge">✨ AI Suggestion</div>
    </div>
  );
}

/* ── UPI Pill with copy ── */
function UpiPill() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText('7080359767@fam');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`upi-pill ${copied ? 'copied' : ''}`} onClick={handleCopy} title="Click to copy">
      <span>7080359767@fam</span>
      <span className="copy-icon">{copied ? '✓ Copied' : '📋 Copy'}</span>
    </div>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStage, setCurrentStage] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [tailoringError, setTailoringError] = useState('');

  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const fileInputRef = useRef(null);
  const toolRef = useRef(null);
  const resultsRef = useRef(null);
  const tailoredRef = useRef(null);
  const templateRef = useRef(null);

  /* Scroll reveal */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('active'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [result, file, loading, tailoredResume, coverLetter]);

  /* Auto-advance loader stages */
  useEffect(() => {
    if (!loading) { setCurrentStage(0); return; }
    if (currentStage >= ANALYSIS_STAGES.length) return;
    const t = setTimeout(() => setCurrentStage(p => p + 1), 800);
    return () => clearTimeout(t);
  }, [loading, currentStage]);

  const handleDownload = (htmlId, filename) => {
    const el = document.getElementById(htmlId);
    if (!el) return;
    html2pdf().set({
      margin: 0.5, filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(el).save().catch(err => {
      console.error('PDF failed:', err);
      alert('PDF download failed — try again.');
    });
  };

  const handleAnalyze = async () => {
    if (!file || !jobDescription.trim()) { setError('Upload a resume & paste a job description.'); return; }
    setLoading(true); setError(''); setResult(null); setCurrentStage(0); 
    const fd = new FormData();
    fd.append('resume', file); fd.append('job_description', jobDescription);
    try {
      const res = await fetch(`${API_URL}/api/analyze`, { method: 'POST', body: fd });
      if (!res.ok) {
        let errDesc = `Server Error (${res.status})`;
        try { const data = await res.json(); if (data.detail) errDesc = data.detail; } catch (e) {}
        throw new Error(errDesc);
      }
      const data = await res.json();
      setAnalysisComplete(true);
      setTimeout(() => {
        setResult(data); setLoading(false); setAnalysisComplete(false); setCurrentStage(0);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
      }, 1200);
    } catch (err) { 
      console.error(err);
      setError(err.message || 'Connection failed. Is the backend running?'); 
      setLoading(false); setCurrentStage(0); 
    }
  };

  const handlePremium = async () => {
    setTailoringLoading(true); setTailoringError(''); setTailoredResume(''); setCoverLetter('');
    const fd = new FormData(); fd.append('resume', file); fd.append('job_description', jobDescription);
    try {
      const res = await fetch(`${API_URL}/api/premium`, { method: 'POST', body: fd });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      setTailoredResume(data.tailored_resume || '');
      setCoverLetter(data.cover_letter || '');
      if (!data.tailored_resume && !data.cover_letter) setTailoringError('AI returned empty results. Retry.');
    } catch (e) { 
      console.error("Premium Error:", e);
      setTailoringError(`Generation failed: ${e.message}`); 
    }
    finally { setTailoringLoading(false); setTimeout(() => tailoredRef.current?.scrollIntoView({ behavior: 'smooth' }), 300); }
  };

  const circumference = 2 * Math.PI * 52;
  const stageProgress = loading ? Math.min((currentStage / ANALYSIS_STAGES.length) * 100, 100) : 0;
  const strokeOffset = circumference - (stageProgress / 100) * circumference;

  return (
    <>
      <MeshBackground />
      <div className="app-wrapper">

        {/* ═══ Premium Modal ═══ */}
        {showPremiumModal && (
          <div className="modal-overlay">
            <div className="premium-modal">
              <button className="modal-close btn-click" onClick={() => setShowPremiumModal(false)}>×</button>
              <div className="premium-header">
                <h2>Pro Suite</h2>
                <span className="price">{couponApplied ? 'FREE' : '₹49 only'}</span>
              </div>

              <div style={{textAlign:'center', marginBottom: 24}}>
                <p style={{fontSize:'0.9rem', color:'#A0A0B8', marginBottom:16, fontWeight:500}}>Pay via Paytm · GPay · PhonePe</p>
                <img src="/qr.png" alt="Payment QR" style={{width:'100%', maxWidth:180, margin:'0 auto', borderRadius:12, border:'1px solid rgba(255,255,255,0.08)', boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}} />
                <div style={{marginTop:16}}>
                  <UpiPill />
                </div>
              </div>

              {!couponApplied && (
                <>
                  <input type="text" className="utr-input" placeholder="12-digit UPI UTR" />
                  <div style={{textAlign:'left', marginBottom:16, marginTop:-4}}>
                    {!showCoupon ? (
                      <span className="btn-click" style={{fontSize:'0.85rem', color:'#00FFB2', cursor:'pointer', fontWeight:600}} onClick={() => setShowCoupon(true)}>Have a coupon code?</span>
                    ) : (
                      <div style={{display:'flex', gap:8, marginTop:8}}>
                        <input type="text" className="utr-input" style={{marginBottom:0, flex:1}} placeholder="Enter coupon" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                        <button className="btn-click" style={{background:'#00FFB2', color:'#0A0A0F', border:'none', borderRadius:8, padding:'0 16px', fontSize:'0.85rem', fontWeight:700, cursor:'pointer'}}
                          onClick={() => { couponCode === 'AADI001' ? (setCouponApplied(true), setCouponError('')) : setCouponError('Invalid coupon code'); }}>
                          Apply
                        </button>
                      </div>
                    )}
                    {couponError && <div style={{color:'#ff6b6b', fontSize:'0.8rem', marginTop:6, fontWeight:500}}>{couponError}</div>}
                  </div>
                </>
              )}
              <button className="unlock-btn btn-click" onClick={() => { setIsUnlocked(true); setShowPremiumModal(false); handlePremium(); }}>
                {couponApplied ? 'Unlock for Free →' : 'Unlock Suite →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ Loading Overlay ═══ */}
        {loading && (
          <div className="analyzing-overlay">
            <div className="analyzing-glass-card">
              <div className="progress-arc-container">
                <svg viewBox="0 0 120 120" className="progress-arc-svg">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#00FFB2" strokeWidth="5"
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                    style={{transition:'stroke-dashoffset 0.8s ease', transform:'rotate(-90deg)', transformOrigin:'center', filter:'drop-shadow(0 0 8px rgba(0,255,178,0.4))'}} />
                </svg>
                <div className="progress-arc-label">
                  {analysisComplete ? <span style={{fontSize:'2rem', color:'#00FFB2'}}>✓</span> : <span>{Math.round(stageProgress)}%</span>}
                </div>
              </div>
              <div className="step-indicator">
                {ANALYSIS_STAGES.map((s, i) => {
                  const done = i < currentStage, active = i === currentStage && !analysisComplete, pending = i > currentStage;
                  return (
                    <div key={i} className={`step-item ${done ? 'done' : ''} ${active ? 'active' : ''} ${pending ? 'pending' : ''}`}>
                      <div className="step-icon">
                        {done ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FFB2" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          : active ? <div className="pulse-dot"></div>
                          : <div className="gray-dot"></div>}
                      </div>
                      <span className="step-label">{s.icon} {s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Navbar ═══ */}
        <nav className="navbar">
          <a className="nav-logo btn-click" href="#">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 16.14 16.14 19.5 12 19.5" stroke="#00FFB2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4"/><path d="M12 9L15 12L12 15M15 12H9" stroke="#00FFB2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            SkillSync AI
          </a>
          <ul className="nav-links">
            <li onClick={() => toolRef.current?.scrollIntoView({ behavior: 'smooth' })}>Resume Check</li>
            <li>Cover Letter</li>
            <li onClick={() => templateRef.current?.scrollIntoView({ behavior: 'smooth' })}>Templates</li>
          </ul>
          <div className="nav-btn-group">
            <button className="nav-cta btn-click" onClick={() => toolRef.current?.scrollIntoView({ behavior: 'smooth' })}>Get Started</button>
          </div>
        </nav>

        {/* ═══ Hero + Upload ═══ */}
        <section className="hero-tool-layout" ref={toolRef}>
          <div className="hero-content reveal">
            <div className="hero-subtitle">AI Resume Screening</div>
            <h1 className="hero-title">Is your resume good enough?</h1>
            <p className="hero-desc">
              A next-gen AI resume checker performing 16 critical analyses to ensure 
              your resume converts into interview callbacks.
            </p>

            <div className="upload-container">
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-title">Drop your resume here or choose a file</div>
                <div className="upload-subtitle">PDF only · Max 2MB</div>
                <input ref={fileInputRef} type="file" accept=".pdf" style={{display:'none'}}
                  onChange={(e) => { if(e.target.files[0]) setFile(e.target.files[0]) }} />
                {file ? <div className="file-indicator">✓ {file.name}</div> : <div className="upload-btn-fake">Upload Resume</div>}
                <div className="privacy-lock">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.24 2 7 4.24 7 7V10H6C4.9 10 4 10.9 4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12C20 10.9 19.1 10 18 10H17V7C17 4.24 14.76 2 12 2ZM9 7C9 5.35 10.35 4 12 4C13.65 4 15 5.35 15 7V10H9V7Z"/></svg>
                  Privacy guaranteed
                </div>
              </div>
              <div className="form-group" style={{marginTop:24}}>
                <textarea className="job-textarea" placeholder="Paste the target Job Description..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
              </div>
              {error && <div className="error-block">{error}</div>}
              <button className="analyze-btn btn-click" onClick={handleAnalyze} disabled={loading || !file || !jobDescription}>Start Analysis</button>
            </div>
          </div>
          <div className="hero-mockup reveal">
            <ResumeMockup />
          </div>
        </section>

        {/* ═══ Marketing Sections ═══ */}
        {!result && !loading && (
          <>
            <section className="dark-section reveal">
              <div className="dark-header">
                <h2>Our AI goes beyond typos and punctuation</h2>
                <p>Built-in deep intelligence to craft a resume tailored to the exact position you're applying for.</p>
              </div>
              <div className="checklist-layout">
                <div className="checklist-intro">
                  <h3>Resume optimization checklist</h3>
                  <p>16 crucial checks across 5 categories — content, format, keywords, style, and skills.</p>
                </div>
                <div className="checklist-grid">
                  {[
                    { title: 'Content', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, items: ['ATS parse rate', 'Word repetition', 'Grammar check', 'Impact quantification'] },
                    { title: 'Format', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, items: ['File format', 'Resume length', 'Bullet brevity'] },
                    { title: 'Skills', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, items: ['Hard skills', 'Soft skills'] },
                    { title: 'Style', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>, items: ['Design analysis', 'Active voice', 'Buzzwords'] },
                  ].map(c => (
                    <div className="c-card" key={c.title}>
                      <div className="c-icon">{c.icon}</div>
                      <h4>{c.title}</h4>
                      <ul className="c-list">{c.items.map(i => <li key={i}>{i}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="feature-section reveal">
              <div className="feature-row">
                <div className="feature-text">
                  <h2>Rewrite your resume with AI</h2>
                  <p>Powered by state-of-the-art LLMs, our engine rewrites your resume to perfectly match the job description — optimizing keywords, structure, and impact.</p>
                  <p style={{marginTop:16}}>Content suggestions, summary generation, and buzzword removal — all automated.</p>
                </div>
                <div className="feature-visual" style={{padding:0, overflow:'hidden'}}>
                  <ResumeMockup />
                </div>
              </div>
              <div className="feature-row reverse" style={{marginTop:100}}>
                <div className="feature-text">
                  <h2>ATS compatibility analysis</h2>
                  <p>We've reverse-engineered popular applicant tracking systems to check your resume's parsability rate, keyword density, and format compliance.</p>
                </div>
                <div className="feature-visual ats-score-visual">
                  <div className="ats-inner">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                      <span style={{fontWeight:700, color:'#fff', fontFamily:'var(--font-display)'}}>ATS Score</span>
                      <span style={{fontWeight:800, color:'#00FFB2', fontSize:'1.5rem', fontFamily:'var(--font-display)', textShadow:'0 0 20px rgba(0,255,178,0.3)'}}>92%</span>
                    </div>
                    <div style={{height:6, background:'#1e1e2e', borderRadius:8, overflow:'hidden'}}>
                      <div style={{width:'92%', height:'100%', background:'linear-gradient(90deg, #00FFB2, #059669)', borderRadius:8, boxShadow:'0 0 12px rgba(0,255,178,0.3)'}}></div>
                    </div>
                    <div className="ats-chips">
                      {['Keywords ✓','Format ✓','Length ✓','Contact ✓'].map(t => <span key={t} className="ats-chip">{t}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            {/* ═══ Templates Coming Soon ═══ */}
            <section className="templates-section" ref={templateRef}>
              <div className="templates-header">
                <span className="coming-soon-badge">Coming Soon</span>
                <h2 className="templates-title">Premium Resume Templates</h2>
                <p className="templates-desc">Professionally designed, ATS-optimized templates crafted to make your resume stand out. Pick a style, import your data, and download.</p>
              </div>
              <div className="templates-grid">
                {[
                  { name: 'Minimal Pro', color: '#00FFB2', bars: [90, 70, 85, 60, 75, 50] },
                  { name: 'Executive Dark', color: '#7C3AED', bars: [85, 65, 90, 55, 80, 45] },
                  { name: 'Creative Edge', color: '#3b82f6', bars: [80, 90, 60, 75, 50, 85] },
                  { name: 'Classic Clean', color: '#f59e0b', bars: [75, 85, 70, 90, 65, 55] },
                ].map((t, idx) => (
                  <div className="template-card" key={idx}>
                    <div className="template-preview" style={{'--accent': t.color}}>
                      <div className="tpl-header">
                        <div className="tpl-avatar" style={{background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`}}></div>
                        <div style={{flex:1}}>
                          <div className="tpl-bar" style={{width:'65%', height:10, background: t.color, opacity: 0.8}}></div>
                          <div className="tpl-bar" style={{width:'45%', height:7, marginTop:6}}></div>
                        </div>
                      </div>
                      <div className="tpl-divider"></div>
                      {t.bars.map((w, i) => (
                        <div className="tpl-bar" key={i} style={{width:`${w}%`, marginBottom: 6}}></div>
                      ))}
                      <div className="template-lock-overlay">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </div>
                    </div>
                    <div className="template-info">
                      <span className="template-name">{t.name}</span>
                      <span className="template-soon" style={{color: t.color}}>Soon</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══ Results ═══ */}
        {result && (
          <section className="results-section" ref={resultsRef}>
            <div className="score-card reveal">
              <div className="score-ring">
                <svg viewBox="0 0 100 100"><circle className="track" cx="50" cy="50" r="45" /><circle className="fill-ring" cx="50" cy="50" r="45" stroke="#00FFB2" strokeDasharray={2*Math.PI*45} strokeDashoffset={2*Math.PI*45-(result.score/100)*(2*Math.PI*45)} /></svg>
                <div className="score-number"><span className="value">{result.score}</span><span className="unit">Score</span></div>
              </div>
              <div className="score-breakdown-panel">
                {['technical_skills','experience','domain_knowledge','education'].map(k => (
                  <div className="breakdown-item" key={k}>
                    <div className="label">{k.replace('_', ' ')} <span>{result.breakdown[k]}%</span></div>
                    <div className="b-bar"><div className="b-fill" style={{width:`${result.breakdown[k]}%`}}></div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-card reveal"><p>{result.summary}</p></div>

            <h3 className="section-title reveal">🎯 Interview Preparation</h3>
            <div className="prep-grid reveal">
              <div className="prep-card"><h4>🔍 Expected Questions</h4><ul>{result.expected_questions?.map((q,i) => <li key={i}>{q}</li>)}</ul></div>
              <div className="prep-card"><h4>⚠️ Areas of Concern</h4><ul>{result.areas_of_concern?.map((c,i) => <li key={i}>{c}</li>)}</ul></div>
              <div className="prep-card"><h4>🏢 Expected Rounds</h4><ol>{result.interview_rounds?.map((r,i) => <li key={i}>{r}</li>)}</ol></div>
              <div className="prep-card"><h4>💡 Pro Tips</h4><ul>{result.preparation_tips?.map((t,i) => <li key={i}>{t}</li>)}</ul></div>
            </div>

            <h3 className="section-title reveal">🗺️ Learning Roadmap</h3>
            <div className="roadmap-grid reveal">
              {result.leetcode_links?.length > 0 && <div className="resource-card"><h4>LeetCode</h4><div className="link-group">{result.leetcode_links.map((l,i)=><a key={i} href={l.url} className="link-pill" target="_blank" rel="noreferrer">{l.title} ↗</a>)}</div></div>}
              {result.youtube_links?.length > 0 && <div className="resource-card"><h4>YouTube</h4><div className="link-group">{result.youtube_links.map((l,i)=><a key={i} href={l.url} className="link-pill" target="_blank" rel="noreferrer">{l.title} ↗</a>)}</div></div>}
              {result.github_repos?.length > 0 && <div className="resource-card"><h4>GitHub</h4><div className="link-group">{result.github_repos.map((l,i)=><a key={i} href={l.url} className="link-pill" target="_blank" rel="noreferrer">{l.title} ↗</a>)}</div></div>}
              {result.related_jobs?.length > 0 && <div className="resource-card"><h4>Jobs</h4><div className="link-group">{result.related_jobs.map((l,i)=><a key={i} href={l.url} className="link-pill" target="_blank" rel="noreferrer">{l.platform} ↗</a>)}</div></div>}
            </div>

            {!isUnlocked && (
              <div className="combo-banner reveal" style={{marginTop:40}}>
                <h3>Unlock Career Pro Suite</h3>
                <p style={{marginBottom:16}}>AI-tailored Resume & Cover Letter to crush the competition.</p>
                <button className="p-btn p-btn-primary btn-click" onClick={() => setShowPremiumModal(true)}>Get Full Suite (₹49)</button>
              </div>
            )}
          </section>
        )}

        {/* ═══ Tailored Output ═══ */}
        {(tailoringLoading || tailoredResume || coverLetter || tailoringError) && (
          <section className="results-section" ref={tailoredRef} style={{paddingTop:20}}>
            {tailoringLoading ? (
              <div style={{textAlign:'center', padding:'60px 0'}}>
                <div className="analyzing-ring" style={{margin:'0 auto 16px'}}></div>
                <p style={{color:'#A0A0B8', fontWeight:500}}>Generating your documents...</p>
              </div>
            ) : tailoringError ? (
              <div style={{background:'rgba(255,107,107,0.06)', padding:24, borderRadius:12, border:'1px solid rgba(255,107,107,0.15)', textAlign:'center'}}>
                <p style={{color:'#ff6b6b', fontWeight:600, marginBottom:12}}>⚠️ {tailoringError}</p>
                <button className="btn-click" style={{background:'#00FFB2', color:'#0A0A0F', border:'none', padding:'10px 24px', borderRadius:8, fontWeight:700, cursor:'pointer'}} onClick={handlePremium}>Retry</button>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:40}}>
                {tailoredResume && (
                  <div className="reveal">
                    <div style={{background:'rgba(0,255,178,0.06)', padding:'16px 24px', borderLeft:'3px solid #00FFB2', borderRadius:8, marginBottom:24}}>
                      <h3 style={{color:'#00FFB2', fontSize:'1.2rem', marginBottom:6, fontWeight:700, fontFamily:'var(--font-display)'}}>🎉 Your Tailored CV</h3>
                      <p style={{color:'#A0A0B8', fontSize:'0.95rem'}}>Matching rate: <strong style={{color:'#00FFB2'}}>95%+</strong> for this role.</p>
                      <button className="btn-click" style={{marginTop:12, background:'#00FFB2', color:'#0A0A0F', border:'none', padding:'10px 20px', borderRadius:6, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6}} onClick={() => handleDownload('tailored-cv-doc','Optimized_Resume.pdf')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download PDF
                      </button>
                    </div>
                    <div id="tailored-cv-doc" className="document-preview" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(marked(tailoredResume))}}></div>
                  </div>
                )}
                {coverLetter && (
                  <div className="reveal">
                    <div style={{background:'rgba(124,58,237,0.08)', padding:'16px 24px', borderLeft:'3px solid #7C3AED', borderRadius:8, marginBottom:24}}>
                      <h3 style={{color:'#A78BFA', fontSize:'1.2rem', marginBottom:6, fontWeight:700, fontFamily:'var(--font-display)'}}>📝 Cover Letter</h3>
                      <p style={{color:'#A0A0B8', fontSize:'0.95rem'}}>Tailored to bridge your experience with the role requirements.</p>
                      <button className="btn-click" style={{marginTop:12, background:'#7C3AED', color:'#fff', border:'none', padding:'10px 20px', borderRadius:6, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6}} onClick={() => handleDownload('cover-letter-doc','Cover_Letter.pdf')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download PDF
                      </button>
                    </div>
                    <div id="cover-letter-doc" className="document-preview" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(marked(coverLetter))}}></div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ═══ Footer ═══ */}
        <footer className="footer reveal">
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            <div className="footer-brand">SkillSync AI</div>
            <div style={{fontSize:'0.85rem', color:'#60607a', fontWeight:500}}>Developed by <strong style={{color:'#00FFB2'}}>AADI</strong></div>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Privacy</a>
            <a href="mailto:adiexzzz@proton.me" className="contact-badge btn-click">adiexzzz@proton.me</a>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
