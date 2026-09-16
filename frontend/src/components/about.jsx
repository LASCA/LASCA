import React from 'react';
import { X, Code2, Mail, User, FileText } from 'lucide-react';

// Το αυθεντικό SVG "βιβλιαράκι" (Repository Icon) του GitHub
const RepoIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
  </svg>
);

// Αυτόνομα SVG εικονίδια για GitHub (προφίλ) & LinkedIn
const GithubIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const About = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const PROJECT_REPO_URL = "https://github.com/LASCA/LASCA";

  const teamMembers = [
    {
      name: "Αλέξανδρος Καραχλές",
      email: "akarachles@gmail.com",
      linkedin: "https://www.linkedin.com/in/alexandros-karachles-93bb7a429/",
      github: "https://github.com/Neversplit2"
    },
    {
      name: "Ηλίας Σαούλιας",
      email: "ilias.saoulias@gmail.com",
      linkedin: "https://www.linkedin.com/in/ilias-saoulias-9b772224b/",
      github: "https://github.com/iliasaou"
    },
    {
      name: "Σάββας Τσιγκουτζίδης",
      email: "savvastsigou@gmail.com",
      linkedin: "https://www.linkedin.com/in/savvas-tsigkoutzidis-38b634264/",
      github: "https://github.com/Savvas-Tsigou"
    }
  ];

  // Συνάρτηση για άνοιγμα παραθύρου επιλογής φάκελου αποθήκευσης
  const handleDownloadManual = async () => {
    try {
      const response = await fetch('/LASCA_Manual.pdf');
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();

      // Αν υποστηρίζεται το Native Save File Picker API
      if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'LASCA_Manual.pdf',
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback λήψη μέσω Blob URL
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'LASCA_Manual.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Σφάλμα κατά την αποθήκευση του εγχειριδίου:', err);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md bg-[#0f172a] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-red-500 opacity-90" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3.5">
            <div className="p-1.5 bg-slate-800/40 rounded-xl border border-slate-700/50 shadow-sm">
              <img src="/LASCA-logo-red-blue-1024.png" alt="LASCA Logo" className="w-7 h-7 object-contain drop-shadow-sm" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 tracking-wider">LASCA</h3>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Manual Download Button */}
            <button 
              onClick={handleDownloadManual}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors group"
              title="Εγχειρίδιο Χρήσης (PDF)"
            >
              <FileText size={17} className="group-hover:scale-105 transition-transform" />
            </button>

            {/* GitHub Repository Link */}
            <a 
              href={PROJECT_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors group"
              title="GitHub Repository"
            >
              <RepoIcon size={17} className="group-hover:scale-105 transition-transform" />
            </a>
            
            {/* Close Modal Button */}
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-300 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Description Box */}
          <div className="relative p-4 pl-5 bg-slate-800/20 border border-slate-800/80 rounded-xl">
            <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full"></div>
            <p className="text-[14px] leading-[1.6] text-slate-300">
              Το <strong className="text-slate-100 font-semibold tracking-wide">LASCA</strong> είναι ένα σύγχρονο λογισμικό τοπογραφικών υπολογισμών, που σχεδιάστηκε για να καλύψει τις εργασίες γραφείου μέσα από μία ενιαία ροή εργασιών. 
              Αναπτύχθηκε από φοιτητές Αγρονόμους και Τοπογράφους Μηχανικούς του ΑΠΘ.
            </p>
          </div>

          {/* Developers Section */}
          <div className="space-y-4 pt-1">
            
            {/* Ultra-Modern Dark Section Header */}
            <div className="relative flex items-center gap-3 pb-1">
              {/* Background ambient glow */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 h-8 bg-blue-500/5 blur-xl rounded-full pointer-events-none"></div>
              
              {/* Dark Icon Container */}
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                <Code2 size={14} className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.6)]" />
              </div>
              
              {/* Gradient Text */}
              <span className="relative text-[11px] font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-200 to-slate-400 drop-shadow-sm">
                Lasca Developers
              </span>
              
              {/* Cyberpunk Divider Line with glowing dot */}
              <div className="flex-1 relative flex items-center ml-1">
                <div className="absolute left-0 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.9)]"></div>
                <div className="w-full h-[1px] bg-gradient-to-r from-blue-500/60 via-slate-700/40 to-transparent"></div>
              </div>
            </div>
            
            <div className="space-y-2.5">
              {teamMembers.map((member, idx) => (
                <div 
                  key={idx}
                  className="group p-3 bg-slate-800/20 hover:bg-slate-800/60 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    
                    {/* User Profile Icon */}
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800/90 via-slate-900 to-slate-950 border border-slate-700/70 text-slate-400 group-hover:border-blue-500/50 group-hover:text-blue-400 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300 shrink-0">
                      <User size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                        {member.name}
                      </h5>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden pt-0 group-hover:pt-3 flex items-center gap-3.5 border-t border-transparent group-hover:border-slate-700/50 mt-0 group-hover:mt-2.5">
                    {member.email && (
                      <a 
                        href={`mailto:${member.email}`} 
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                        title={member.email}
                      >
                        <Mail size={14} />
                        <span className="truncate max-w-[130px]">{member.email}</span>
                      </a>
                    )}

                    {member.linkedin && (
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <LinkedinIcon size={14} />
                        <span>LinkedIn</span>
                      </a>
                    )}

                    {member.github && (
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <GithubIcon size={14} />
                        <span>GitHub</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;