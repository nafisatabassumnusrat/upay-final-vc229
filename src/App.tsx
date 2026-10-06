import { useState, useMemo } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { 
  FileText, CheckCircle, AlertCircle, XCircle, 
  UploadCloud, HelpCircle, RotateCcw, ChevronRight, 
  Settings2, File, MoreVertical, Trash2, Calendar
} from 'lucide-react';
import './App.css';

type TenderInfo = {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string;
};

type Requirement = {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
  description_en?: string;
  description_bn?: string;
};

type UploadedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  hash: string;
  numPages: number;
  isDuplicate: boolean;
  duplicateOf?: string;
  error?: string;
};

type StatusType = 'Missing' | 'Expiry date needed' | 'Expired' | 'Not provided' | 'OK';

const App = () => {
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [tender] = useState<TenderInfo | null>({
    title: "Supply of IT Equipment",
    tender_id: "T-2026-0417",
    procuring_entity: "Directorate of Sample Services",
    bidder: "Meghna Tech Solutions Ltd.",
    submission_deadline: "2026-10-20"
  });
  
  const [requirements] = useState<Requirement[]>([
    { id: 'R01', order: 1, title_en: 'Trade License', title_bn: 'ট্রেড লাইসেন্স', mandatory: true, has_expiry: true },
    { id: 'R02', order: 2, title_en: 'TIN Certificate', title_bn: 'টিআইএন সনদ', mandatory: true, has_expiry: false },
    { id: 'R03', order: 3, title_en: 'VAT Registration Certificate', title_bn: 'ভ্যাট নিবন্ধন সনদ', mandatory: true, has_expiry: false },
    { id: 'R04', order: 4, title_en: 'Bank Solvency Certificate', title_bn: 'ব্যাংক সচ্ছলতা সনদ', mandatory: true, has_expiry: true },
    { id: 'R05', order: 5, title_en: 'Experience Certificate', title_bn: 'অভিজ্ঞতার সনদ', mandatory: true, has_expiry: false },
    { id: 'R06', order: 6, title_en: 'Audited Financial Statement', title_bn: 'নিরীক্ষিত আর্থিক বিবরণী', mandatory: false, has_expiry: false },
    { id: 'R07', order: 7, title_en: 'Manufacturer\'s Authorization', title_bn: 'প্রস্তুতকারকের অনুমোদনপত্র', mandatory: false, has_expiry: true },
    { id: 'R08', order: 8, title_en: 'Technical Proposal', title_bn: 'কারিগরি প্রস্তাব', mandatory: true, has_expiry: false },
    { id: 'R09', order: 9, title_en: 'Financial Proposal', title_bn: 'আর্থিক প্রস্তাব', mandatory: true, has_expiry: false },
    { id: 'R10', order: 10, title_en: 'Signed Declaration', title_bn: 'স্বাক্ষরিত ঘোষণাপত্র', mandatory: true, has_expiry: false }
  ]);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({}); 
  const [expiries, setExpiries] = useState<Record<string, string>>({}); 
  const [isGenerating, setIsGenerating] = useState(false);

  const t = (en: string, bn: string) => lang === 'en' ? en : bn;

  const getHash = async (buffer: ArrayBuffer) => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: UploadedFile[] = [...files];
    
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      if (file.type !== 'application/pdf') {
        alert(t(`File ${file.name} is not a PDF.`, `ফাইল ${file.name} PDF নয়।`));
        continue;
      }
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hash = await getHash(arrayBuffer);
        
        let isDuplicate = false;
        let duplicateOf = '';
        const existing = newFiles.find(f => f.hash === hash);
        if (existing) {
          isDuplicate = true;
          duplicateOf = existing.name;
        }

        let numPages = 0;
        let fileError = '';
        try {
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          numPages = pdfDoc.getPageCount();
        } catch (err) {
          fileError = t('Damaged PDF', 'ক্ষতিগ্রস্ত PDF');
        }

        const id = Math.random().toString(36).substring(7);
        newFiles.push({
          id,
          file,
          name: file.name,
          size: file.size,
          hash,
          numPages,
          isDuplicate,
          duplicateOf,
          error: fileError
        });
      } catch (error) {
        console.error(error);
      }
    }
    
    const hashCounts: Record<string, number> = {};
    newFiles.forEach(f => {
      hashCounts[f.hash] = (hashCounts[f.hash] || 0) + 1;
    });
    newFiles.forEach(f => {
      f.isDuplicate = hashCounts[f.hash] > 1;
    });

    setFiles(newFiles);
  };

  const removeFile = (id: string) => {
    const newFiles = files.filter(f => f.id !== id);
    const hashCounts: Record<string, number> = {};
    newFiles.forEach(f => {
      hashCounts[f.hash] = (hashCounts[f.hash] || 0) + 1;
    });
    newFiles.forEach(f => {
      f.isDuplicate = hashCounts[f.hash] > 1;
    });
    setFiles(newFiles);
    
    const newMatches = { ...matches };
    Object.keys(newMatches).forEach(reqId => {
      if (newMatches[reqId] === id) {
        delete newMatches[reqId];
      }
    });
    setMatches(newMatches);
  };

  const matchFile = (reqId: string, fileId: string) => {
    const newMatches = { ...matches };
    Object.keys(newMatches).forEach(rId => {
      if (newMatches[rId] === fileId) {
        delete newMatches[rId];
      }
    });
    if (fileId) {
      newMatches[reqId] = fileId;
    } else {
      delete newMatches[reqId];
    }
    setMatches(newMatches);
  };

  const getStatus = (req: Requirement): StatusType => {
    const matchedFileId = matches[req.id];
    if (!matchedFileId) {
      return req.mandatory ? 'Missing' : 'Not provided';
    }
    if (req.has_expiry) {
      const expiry = expiries[req.id];
      if (!expiry) return 'Expiry date needed';
      if (tender?.submission_deadline) {
        const expiryDate = new Date(expiry);
        const submitDate = new Date(tender.submission_deadline);
        if (expiryDate < submitDate) {
          return 'Expired';
        }
      }
    }
    return 'OK';
  };

  const isBlocking = (status: StatusType) => {
    return status === 'Missing' || status === 'Expiry date needed' || status === 'Expired';
  };

  const canGenerate = () => {
    if (requirements.length === 0) return false;
    for (const req of requirements) {
      if (isBlocking(getStatus(req))) return false;
    }
    return true;
  };

  const { readyCount, totalCount, blockCount, issueCount } = useMemo(() => {
    let ready = 0;
    let block = 0;
    let issue = 0;
    requirements.forEach(req => {
      const st = getStatus(req);
      if (st === 'OK' || st === 'Not provided') ready++;
      if (isBlocking(st)) {
        block++;
        if (st === 'Missing') issue++;
        else issue++; 
      }
    });
    return { readyCount: ready, totalCount: requirements.length, blockCount: block, issueCount: issue };
  }, [requirements, matches, expiries]);

  const generatePackage = async () => {
    if (!tender) return;
    setIsGenerating(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      
      const coverPage = mergedPdf.addPage([595.28, 841.89]);
      const { height } = coverPage.getSize();
      
      coverPage.drawText('TENDER DOCUMENT PACKAGE', {
        x: 50, y: height - 100, size: 24, font: helveticaBold
      });
      
      coverPage.drawText(`Tender ID: ${tender.tender_id}`, { x: 50, y: height - 150, size: 12, font: helveticaBold });
      
      for (const req of requirements) {
        const fileId = matches[req.id];
        if (!fileId) continue;
        const fileObj = files.find(f => f.id === fileId);
        if (!fileObj || fileObj.error) continue;
        const arrayBuffer = await fileObj.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tender.tender_id}_Package.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setIsGenerating(false);
  };

  const formatSize = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + ' MB';

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo-box">
            <FileText className="logo-icon" />
          </div>
          <span className="logo-text">{t('Tender Document Package Builder', 'টেন্ডার ডকুমেন্ট প্যাকেজ বিল্ডার')}</span>
          <span className="logo-subtitle">{t('Smart Tender Package Builder', 'স্মার্ট টেন্ডার প্যাকেজ বিল্ডার')}</span>
        </div>
        <div className="nav-right">
          <div className="lang-toggle">
            <span className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</span>
            <span className="sep">|</span>
            <span className={lang === 'bn' ? 'active' : ''} onClick={() => setLang('bn')}>বাংলা</span>
          </div>
          <button className="nav-btn" onClick={() => { setFiles([]); setMatches({}); setExpiries({}); }}>
            <RotateCcw size={16} /> {t('Reset', 'রিসেট')}
          </button>
          <button className="nav-btn">
            <HelpCircle size={16} /> {t('Help', 'সাহায্য')}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {/* Tender Overview Header */}
        <section className="tender-overview">
          <div className="tender-card">
            <div className="tender-icon">
              <FileText size={32} color="#1d4ed8" />
            </div>
            <div className="tender-details">
              <div className="td-label">{t('TENDER OVERVIEW', 'টেন্ডার ওভারভিউ')}</div>
              <h2 className="td-title">{tender?.title}</h2>
              <div className="td-meta">
                <div className="meta-item">
                  <span className="meta-label">{t('Tender ID', 'টেন্ডার আইডি')}</span>
                  <span className="meta-value">{tender?.tender_id}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('Procuring Entity', 'ক্রয়কারী প্রতিষ্ঠান')}</span>
                  <span className="meta-value">{tender?.procuring_entity}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('Bidder', 'দরদাতা')}</span>
                  <span className="meta-value">{tender?.bidder}</span>
                </div>
                <div className="meta-item date-item">
                  <span className="meta-label">{t('Submission Deadline', 'জমার শেষ তারিখ')}</span>
                  <span className="meta-value flex-center">
                    <Calendar size={14} className="mr-1" />
                    {tender?.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'}) : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="package-readiness">
            <div className="pr-header">
              <div className="pr-label">{t('PACKAGE READINESS', 'প্যাকেজ প্রস্তুতি')}</div>
              <div className="pr-stats"><strong>{readyCount} / {totalCount}</strong> {t('requirements ready', 'টি প্রয়োজনীয়তা প্রস্তুত')}</div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(readyCount/totalCount)*100}%` }}></div>
              </div>
              <span className="progress-pct">{Math.round((readyCount/totalCount)*100)}%</span>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="steps-container">
          <div className="step active">
            <div className="step-circle">1</div>
            <div className="step-text">
              <div className="step-title">{t('Requirements', 'প্রয়োজনীয়তা')}</div>
              <div className="step-sub">{t('View required documents', 'প্রয়োজনীয় নথি দেখুন')}</div>
            </div>
          </div>
          <ChevronRight className="step-arrow" size={16} />
          
          <div className="step">
            <div className="step-circle muted">2</div>
            <div className="step-text">
              <div className="step-title muted">{t('Upload', 'আপলোড')}</div>
              <div className="step-sub">{t('Add your PDF files', 'আপনার পিডিএফ ফাইল যোগ করুন')}</div>
            </div>
          </div>
          <ChevronRight className="step-arrow" size={16} />

          <div className="step">
            <div className="step-circle muted">3</div>
            <div className="step-text">
              <div className="step-title muted">{t('Match', 'মিলান')}</div>
              <div className="step-sub">{t('Link files to requirements', 'নথিগুলো লিঙ্ক করুন')}</div>
            </div>
          </div>
          <ChevronRight className="step-arrow" size={16} />

          <div className="step">
            <div className="step-circle muted">4</div>
            <div className="step-text">
              <div className="step-title muted">{t('Verify', 'যাচাই')}</div>
              <div className="step-sub">{t('Check expiry & validation', 'মেয়াদ এবং বৈধতা দেখুন')}</div>
            </div>
          </div>
          <ChevronRight className="step-arrow" size={16} />

          <div className="step">
            <div className="step-circle muted">5</div>
            <div className="step-text">
              <div className="step-title muted">{t('Generate', 'তৈরি করুন')}</div>
              <div className="step-sub">{t('Create final package', 'চূড়ান্ত প্যাকেজ তৈরি করুন')}</div>
            </div>
          </div>
        </section>

        {/* Two columns */}
        <div className="split-view">
          
          {/* Left Column - Requirements */}
          <div className="left-panel">
            <div className="panel-header">
              <div className="ph-left">
                <div className="ph-icon"><FileText size={20} color="#2563eb" /></div>
                <div>
                  <h3 className="ph-title">{t('Required Documents', 'প্রয়োজনীয় নথিপত্র')}</h3>
                  <div className="ph-sub">{t('All required documents for this tender', 'এই টেন্ডারের জন্য সমস্ত প্রয়োজনীয় নথি')}</div>
                </div>
              </div>
              <div className="ph-right">
                <span className="req-count">{requirements.length} {t('requirements', 'টি প্রয়োজনীয়তা')}</span>
                <Settings2 size={18} color="#64748b" />
              </div>
            </div>

            <div className="req-table">
              <div className="rt-header">
                <div className="rt-col rt-num">#</div>
                <div className="rt-col rt-name">{t('Document Name', 'নথির নাম')}</div>
                <div className="rt-col rt-type">{t('Type', 'প্রকার')}</div>
                <div className="rt-col rt-expiry">{t('Expiry', 'মেয়াদ')}</div>
                <div className="rt-col rt-status">{t('Status', 'অবস্থা')}</div>
                <div className="rt-col rt-match">{t('Matched File', 'মিলিত ফাইল')}</div>
              </div>
              
              <div className="rt-body">
                {requirements.map(req => {
                  const status = getStatus(req);
                  const matchedFile = files.find(f => f.id === matches[req.id]);
                  
                  return (
                    <div className="rt-row" key={req.id}>
                      <div className="rt-col rt-num">
                        <span className="num-badge">0{req.order}</span>
                      </div>
                      <div className="rt-col rt-name">
                        <div className="doc-title">{lang === 'en' ? req.title_en : req.title_bn}</div>
                        <div className="doc-sub">{lang === 'en' ? req.description_en : (req.description_bn || req.description_en)}</div>
                      </div>
                      <div className="rt-col rt-type">
                        <span className={`type-badge ${req.mandatory ? 'mandatory' : 'optional'}`}>
                          {req.mandatory ? t('Mandatory', 'বাধ্যতামূলক') : t('Optional', 'ঐচ্ছিক')}
                        </span>
                      </div>
                      <div className="rt-col rt-expiry">
                        {req.has_expiry ? (
                          <span className="expiry-yes"><Calendar size={14} /> {t('Yes', 'হ্যাঁ')}</span>
                        ) : (
                          <span className="expiry-no">— {t('No', 'না')}</span>
                        )}
                      </div>
                      <div className="rt-col rt-status">
                        {status === 'OK' && <span className="status-badge ok"><CheckCircle size={16} className="fill-icon"/> OK</span>}
                        {status === 'Missing' && <span className="status-badge missing"><XCircle size={16} className="fill-icon"/> {t('Missing', 'অনুপস্থিত')}</span>}
                        {status === 'Expiry date needed' && <span className="status-badge warning"><AlertCircle size={16} className="fill-icon"/> {t('Expiry Date Needed', 'মেয়াদ প্রয়োজন')}</span>}
                        {status === 'Expired' && <span className="status-badge missing"><XCircle size={16} className="fill-icon"/> {t('Expired', 'মেয়াদ উত্তীর্ণ')}</span>}
                        {status === 'Not provided' && <span className="status-badge neutral"><XCircle size={16} className="fill-icon"/> {t('Not Provided', 'দেওয়া হয়নি')}</span>}
                      </div>
                      <div className="rt-col rt-match">
                        {matchedFile ? (
                          <div className="matched-file-info">
                            <div className="mf-name">{matchedFile.name}</div>
                            <div className="mf-meta">({matchedFile.numPages} {t('pages', 'পৃষ্ঠা')} · {formatSize(matchedFile.size)})</div>
                          </div>
                        ) : (
                          <div className="unmatched-info">
                            <div className="um-dash">—</div>
                            <div className="um-text">{t('No file matched', 'কোন ফাইল মেলেনি')}</div>
                          </div>
                        )}
                        <ChevronRight size={16} color="#94a3b8" className="ml-auto" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Upload & Files */}
          <div className="right-panel">
            <h3 className="section-title">{t('Upload PDF Files', 'পিডিএফ ফাইল আপলোড করুন')}</h3>
            
            <label className="upload-box">
              <input type="file" multiple accept="application/pdf" className="hidden" onChange={handleUploadFiles} />
              <div className="ub-icon"><UploadCloud size={32} color="#3b82f6" /></div>
              <div className="ub-content">
                <div className="ub-title">{t('Drop PDF files here', 'পিডিএফ ফাইল এখানে ড্রপ করুন')}</div>
                <div className="ub-or">{t('or', 'বা')}</div>
                <div className="ub-btn">{t('Browse Files', 'ফাইল ব্রাউজ করুন')}</div>
                <div className="ub-limits">{t('PDF only · Max 30 files · Max 50 MB total', 'শুধুমাত্র পিডিএফ · সর্বোচ্চ ৩০ টি ফাইল · সর্বোচ্চ ৫০ মেগাবাইট')}</div>
              </div>
            </label>

            <div className="files-header">
              <h3 className="section-title mb-0">{t('Uploaded Files', 'আপলোড করা ফাইল')} <span className="text-gray-400 font-normal">({files.length})</span></h3>
              <span className="sort-dropdown">{t('Sort by: Newest', 'ক্রমানুসার: নতুন')} ▾</span>
            </div>

            <div className="files-list">
              {files.map(f => {
                const reqMatchId = Object.keys(matches).find(k => matches[k] === f.id);
                const reqMatch = requirements.find(r => r.id === reqMatchId);
                const status = reqMatch ? getStatus(reqMatch) : null;
                
                return (
                  <div className="file-card" key={f.id}>
                    <div className="fc-icon">
                      <div className="pdf-doc-icon">
                        <span className="pdf-label">PDF</span>
                      </div>
                    </div>
                    
                    <div className="fc-details">
                      <div className="fc-name">{f.name}</div>
                      <div className="fc-meta">{f.numPages} {t('pages', 'পৃষ্ঠা')} · {formatSize(f.size)}</div>
                    </div>
                    
                    <div className="fc-status-area">
                      {reqMatch ? (
                        <>
                          <div className="fc-match-badge ok">
                            <CheckCircle size={12}/> {t('Matched', 'মিলিত')}
                          </div>
                          <div className="fc-match-target flex items-center">
                            → 
                            <select 
                              className="ml-1 bg-transparent border-none text-xs outline-none cursor-pointer hover:text-blue-600 text-gray-600"
                              value={reqMatchId || ''}
                              onChange={(e) => matchFile(e.target.value, f.id)}
                            >
                              <option value="">{t('Select Requirement', 'প্রয়োজনীয়তা নির্বাচন করুন')}</option>
                              {requirements.map(r => (
                                <option key={r.id} value={r.id} disabled={!!matches[r.id] && matches[r.id] !== f.id}>
                                  {lang === 'en' ? r.title_en : r.title_bn}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {status === 'OK' && (
                            <div className="fc-valid">
                              <CheckCircle size={12}/> {t('Valid', 'বৈধ')}
                            </div>
                          )}
                          {status === 'Expiry date needed' && (
                            <div className="fc-invalid">
                              <AlertCircle size={12}/> {t('Expiry date required', 'মেয়াদ উত্তীর্ণের তারিখ প্রয়োজন')}
                              <span className="text-red-500 ml-2 flex items-center"><Calendar size={12} className="mr-1"/>
                                <input 
                                  type="date" 
                                  className="text-xs ml-1 border border-red-200 rounded px-1 outline-none text-red-600" 
                                  value={expiries[reqMatch.id] || ''}
                                  onChange={e => setExpiries({...expiries, [reqMatch.id]: e.target.value})}
                                />
                              </span>
                            </div>
                          )}
                          {status === 'Expired' && (
                            <div className="fc-invalid">
                              <XCircle size={12}/> {t('Expired', 'মেয়াদ উত্তীর্ণ')}
                              <span className="text-red-500 ml-2 flex items-center"><Calendar size={12} className="mr-1"/>
                                <input 
                                  type="date" 
                                  className="text-xs ml-1 border border-red-200 rounded px-1 outline-none text-red-600" 
                                  value={expiries[reqMatch.id] || ''}
                                  onChange={e => setExpiries({...expiries, [reqMatch.id]: e.target.value})}
                                />
                              </span>
                            </div>
                          )}
                          {status === 'OK' && reqMatch.has_expiry && (
                            <div className="fc-valid flex items-center mt-1 text-xs">
                              <Calendar size={12} className="mr-1"/>
                              <input 
                                type="date" 
                                className="text-xs ml-1 border border-green-200 rounded px-1 outline-none text-green-600 bg-transparent" 
                                value={expiries[reqMatch.id] || ''}
                                onChange={e => setExpiries({...expiries, [reqMatch.id]: e.target.value})}
                              />
                            </div>
                          )}
                        </>
                      ) : f.isDuplicate ? (
                        <>
                          <div className="fc-match-badge error">
                            <AlertCircle size={12}/> {t('Duplicate', 'অনুরূপ')}
                          </div>
                          <div className="fc-match-target text-gray-500">
                            {t('Same content as:', 'একই বিষয়বস্তু:')} {f.duplicateOf || 'another file'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="fc-match-badge neutral">
                            <XCircle size={12}/> {t('Not Matched', 'মিলিত নয়')}
                          </div>
                          <div className="fc-match-target text-gray-400 flex items-center">
                            → 
                            <select 
                              className="ml-1 bg-transparent border-none text-xs outline-none cursor-pointer hover:text-blue-600"
                              value={reqMatchId || ''}
                              onChange={(e) => matchFile(e.target.value, f.id)}
                            >
                              <option value="">{t('Select Requirement', 'প্রয়োজনীয়তা নির্বাচন করুন')}</option>
                              {requirements.map(r => (
                                <option key={r.id} value={r.id} disabled={!!matches[r.id] && matches[r.id] !== f.id}>
                                  {lang === 'en' ? r.title_en : r.title_bn}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="fc-actions">
                      <MoreVertical size={16} color="#94a3b8" className="cursor-pointer hover:text-gray-700" />
                      <Trash2 size={16} color="#94a3b8" className="cursor-pointer hover:text-red-500 ml-2" onClick={() => removeFile(f.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
        
        {/* Footer Credit */}
        <footer className="footer-credit">
          <p>{t('Developed by', 'ডেভেলপ করেছেন')} <strong>Nafisaa tabassum nusrat</strong></p>
        </footer>
      </main>

      {/* Bottom Action Bar */}
      <div className="bottom-bar">
        <div className="bb-left">
          <div className="bb-icon-blocked">
            <AlertCircle size={24} color="#ef4444" className="fill-icon" />
          </div>
          <div>
            <div className="bb-title">{t('PACKAGE GENERATION BLOCKED', 'প্যাকেজ জেনারেশন ব্লক করা হয়েছে')}</div>
            <div className="bb-sub">{t('Resolve all blocking issues before generating the package.', 'প্যাকেজ তৈরি করতে সমস্ত সমস্যা সমাধান করুন।')}</div>
          </div>
        </div>
        
        <div className="bb-center">
          <div className="bb-stat ok">
            <CheckCircle size={16} className="fill-icon" /> {readyCount} {t('Ready', 'প্রস্তুত')}
          </div>
          <div className="bb-stat warning">
            <AlertCircle size={16} className="fill-icon" /> {blockCount - issueCount} {t('Issue', 'সমস্যা')}
          </div>
          <div className="bb-stat error">
            <XCircle size={16} className="fill-icon" /> {issueCount} {t('Missing', 'অনুপস্থিত')}
          </div>
        </div>
        
        <div className="bb-right">
          <button 
            className={`btn-generate-main ${!canGenerate() ? 'disabled' : ''}`}
            disabled={!canGenerate()}
            onClick={generatePackage}
          >
            <File size={16} /> {isGenerating ? t('Generating...', 'তৈরি হচ্ছে...') : t('Generate Package', 'প্যাকেজ তৈরি করুন')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
