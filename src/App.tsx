import { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, FileWarning, Plus, X, Globe, Download, RefreshCw, File } from 'lucide-react';
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
};

type UploadedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  hash: string;
  numPages: number;
  isDuplicate: boolean;
  error?: string;
};

type StatusType = 'Missing' | 'Expiry date needed' | 'Expired' | 'Not provided' | 'OK';

const App = () => {
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [tender, setTender] = useState<TenderInfo | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({}); 
  const [expiries, setExpiries] = useState<Record<string, string>>({}); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = (en: string, bn: string) => lang === 'en' ? en : bn;

  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.tender && json.requirements) {
          setTender(json.tender);
          setRequirements(json.requirements.sort((a: any, b: any) => a.order - b.order));
          setErrorMsg('');
        } else {
          setErrorMsg(t('Invalid requirements format.', 'অবৈধ রিকোয়ারমেন্টস ফরম্যাট।'));
        }
      } catch (err) {
        setErrorMsg(t('Failed to parse JSON.', 'JSON পার্স করতে ব্যর্থ হয়েছে।'));
      }
    };
    reader.readAsText(file);
  };

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
        if (newFiles.some(f => f.hash === hash)) {
          isDuplicate = true;
        }

        let numPages = 0;
        let fileError = '';
        try {
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          numPages = pdfDoc.getPageCount();
        } catch (err) {
          fileError = t('Damaged or protected PDF', 'ক্ষতিগ্রস্ত বা সুরক্ষিত PDF');
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

  const generatePackage = async () => {
    if (!tender) return;
    setIsGenerating(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      
      const coverPage = mergedPdf.addPage([595.28, 841.89]);
      const { height } = coverPage.getSize();
      
      coverPage.drawText('TENDER DOCUMENT PACKAGE', {
        x: 50, y: height - 100, size: 24, font: helveticaBold
      });
      
      const drawField = (label: string, value: string, yOffset: number) => {
        coverPage.drawText(label + ':', { x: 50, y: height - yOffset, size: 12, font: helveticaBold });
        coverPage.drawText(value, { x: 200, y: height - yOffset, size: 12, font: helveticaFont });
      };

      drawField('Tender ID', tender.tender_id, 150);
      drawField('Title', tender.title, 180);
      drawField('Procuring Entity', tender.procuring_entity, 210);
      drawField('Bidder Name', tender.bidder, 240);
      drawField('Submission Deadline', tender.submission_deadline, 270);
      drawField('Date Generated', new Date().toLocaleDateString('en-CA'), 300);

      coverPage.drawText('Included Documents:', { x: 50, y: height - 350, size: 14, font: helveticaBold });
      
      let docY = 380;
      const includedReqs = requirements.filter(req => matches[req.id]);
      includedReqs.forEach((req, idx) => {
        coverPage.drawText(`${idx + 1}. ${req.title_en}`, { x: 50, y: height - docY, size: 12, font: helveticaFont });
        docY += 25;
      });

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

      const totalPages = mergedPdf.getPageCount();
      for (let i = 0; i < totalPages; i++) {
        const page = mergedPdf.getPage(i);
        const { width } = page.getSize();
        const footerText = `${tender.tender_id} | Page ${i + 1} of ${totalPages}`;
        page.drawText(footerText, {
          x: width / 2 - 80,
          y: 20,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
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
      alert(t('Error generating package.', 'প্যাকেজ তৈরি করতে ত্রুটি।'));
    }
    setIsGenerating(false);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <FileText className="icon-blue" />
            <h1>TenderPack Pro</h1>
          </div>
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}>
            <Globe className="icon-small" />
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="left-col">
          {!tender ? (
            <div className="empty-state">
              <Upload className="icon-large" />
              <h2>{t('Load Requirements', 'রিকোয়ারমেন্টস লোড করুন')}</h2>
              <p>{t('Upload the requirements.json file to begin building your tender document package.', 'শুরু করতে requirements.json ফাইলটি আপলোড করুন।')}</p>
              <label className="btn-primary">
                <File className="icon-small text-white" />
                {t('Select requirements.json', 'requirements.json নির্বাচন করুন')}
                <input type="file" accept="application/json" hidden onChange={handleLoadJson} />
              </label>
              {errorMsg && <p className="error-text">{errorMsg}</p>}
            </div>
          ) : (
            <>
              <div className="tender-info card">
                <h2>{tender.title}</h2>
                <div className="tender-grid">
                  <div className="tender-item">
                    <span>{t('Tender ID', 'টেন্ডার আইডি')}</span>
                    <strong>{tender.tender_id}</strong>
                  </div>
                  <div className="tender-item">
                    <span>{t('Submission Deadline', 'জমার শেষ তারিখ')}</span>
                    <strong>{tender.submission_deadline}</strong>
                  </div>
                  <div className="tender-item">
                    <span>{t('Procuring Entity', 'ক্রয়কারী প্রতিষ্ঠান')}</span>
                    <strong>{tender.procuring_entity}</strong>
                  </div>
                  <div className="tender-item">
                    <span>{t('Bidder', 'দরদাতা')}</span>
                    <strong>{tender.bidder}</strong>
                  </div>
                </div>
              </div>

              <div className="req-list card">
                <div className="card-header">
                  <h3>{t('Required Documents', 'প্রয়োজনীয় নথিপত্র')}</h3>
                </div>
                <div className="req-items">
                  {requirements.map((req) => {
                    const status = getStatus(req);
                    const isBlock = isBlocking(status);
                    
                    return (
                      <div key={req.id} className={`req-item ${isBlock ? 'req-error' : ''}`}>
                        <div className="req-header">
                          <span className="req-order">{req.order}</span>
                          <h4>
                            {lang === 'en' ? req.title_en : req.title_bn}
                            {req.mandatory && <span className="mandatory-star">*</span>}
                          </h4>
                        </div>
                        
                        <div className="req-body">
                          <div className="req-status-badges">
                            {status === 'OK' && <span className="badge badge-success"><CheckCircle className="icon-tiny"/> OK</span>}
                            {status === 'Missing' && <span className="badge badge-danger"><XCircle className="icon-tiny"/> {t('Missing', 'অনুপস্থিত')}</span>}
                            {status === 'Not provided' && <span className="badge badge-neutral"><AlertCircle className="icon-tiny"/> {t('Not provided', 'প্রদান করা হয়নি')}</span>}
                            {status === 'Expiry date needed' && <span className="badge badge-warning"><FileWarning className="icon-tiny"/> {t('Expiry date needed', 'মেয়াদ উত্তীর্ণের তারিখ প্রয়োজন')}</span>}
                            {status === 'Expired' && <span className="badge badge-danger"><XCircle className="icon-tiny"/> {t('Expired', 'মেয়াদ উত্তীর্ণ')}</span>}
                          </div>
                          
                          <div className="req-actions">
                            <select 
                              className="file-select"
                              value={matches[req.id] || ''}
                              onChange={(e) => matchFile(req.id, e.target.value)}
                            >
                              <option value="">{t('-- Select File --', '-- ফাইল নির্বাচন করুন --')}</option>
                              {files.map(f => (
                                <option key={f.id} value={f.id} disabled={f.isDuplicate || f.error !== ''}>
                                  {f.name} {f.isDuplicate ? '(Duplicate)' : ''} {f.error ? `(${f.error})` : ''}
                                </option>
                              ))}
                            </select>
                            
                            {req.has_expiry && matches[req.id] && (
                              <input 
                                type="date" 
                                className="date-input"
                                value={expiries[req.id] || ''}
                                onChange={(e) => setExpiries({...expiries, [req.id]: e.target.value})}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="right-col">
          <div className="uploads card">
            <h3>{t('Uploaded Files', 'আপলোড করা ফাইল')}</h3>
            
            <label className="upload-dropzone">
              <Plus className="icon-blue icon-large" />
              <span>{t('Drop PDFs or click to upload', 'PDF ড্রপ করুন বা ক্লিক করুন')}</span>
              <input type="file" multiple accept="application/pdf" hidden onChange={handleUploadFiles} />
            </label>

            <div className="file-list">
              {files.map(f => (
                <div key={f.id} className={`file-item ${f.isDuplicate || f.error ? 'file-error' : ''}`}>
                  <button onClick={() => removeFile(f.id)} className="btn-remove">
                    <X className="icon-tiny" />
                  </button>
                  <div className="file-icon">
                    <FileText className="icon-small" />
                  </div>
                  <div className="file-info">
                    <div className="file-name" title={f.name}>{f.name}</div>
                    <div className="file-meta">
                      <span>{f.numPages > 0 ? `${f.numPages} pages` : 'Reading...'}</span>
                      <span>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    {f.isDuplicate && <div className="file-badge badge-danger">{t('Duplicate Content', 'অনুরূপ বিষয়বস্তু')}</div>}
                    {f.error && <div className="file-badge badge-danger">{f.error}</div>}
                    {Object.values(matches).includes(f.id) && <div className="file-badge badge-success">{t('Matched', 'মিলিত')}</div>}
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <div className="file-empty">
                  <FileText className="icon-xl text-gray-300" />
                  <p>{t('No files uploaded yet.', 'এখনও কোন ফাইল আপলোড করা হয়নি।')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="generate-card card">
            <h3>{t('Final Action', 'চূড়ান্ত কর্ম')}</h3>
            
            <button 
              onClick={generatePackage}
              disabled={!canGenerate() || isGenerating}
              className={`btn-generate ${canGenerate() && !isGenerating ? 'active' : 'disabled'}`}
            >
              {isGenerating ? <RefreshCw className="icon-small spin" /> : <Download className="icon-small" />}
              {isGenerating ? t('Generating Package...', 'তৈরি হচ্ছে...') : t('Generate Package', 'প্যাকেজ তৈরি করুন')}
            </button>

            {!canGenerate() && requirements.length > 0 && (
              <div className="generate-warning">
                <AlertCircle className="icon-tiny" />
                <p>{t('Resolve blocking issues in the required documents to generate the final package.', 'প্যাকেজ তৈরি করতে প্রয়োজনীয় নথিপত্রের সমস্যাগুলি সমাধান করুন।')}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
