import React from 'react';
import { X, Code2, Heart, Award, Mail, User } from 'lucide-react';

// Αυτόνομα SVG εικονίδια για GitHub & LinkedIn (επειδή δεν περιλαμβάνονται στο Lucide)
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

  // -------------------------------------------------------------
  // ΣΥΜΠΛΗΡΩΣΕ ΕΔΩ ΤΑ ΣΤΟΙΧΕΙΑ ΤΗΣ ΟΜΑΔΑΣ (LASKA DEVELOPERS)
  // -------------------------------------------------------------
  const teamMembers = [
    {
      name: "Αλέξανδρος Χ. Καραχλές",
      role: "",
      email: "akarachles@gmail.com",
      linkedin: "https://linkedin.com/in/username1",
      github: "https://github.com/Neversplit2"
    },
    {
      name: "Ηλίας Α. Σαούλιας",
      role: "Frontend Engineer / UI UX",
      email: "developer2@example.com",
      linkedin: "https://linkedin.com/in/username2",
    },
    {
      name: "Σάββας E. Τσιγκουτζίδης",
      role: "Algorithm & Math Specialist",
      email: "savvastsigou@gmail.com",
      linkedin: "https://linkedin.com/in/username3",
      github: "https://github.com/Savvas-Tsigou"
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <img src="/LASCA-logo-red-blue-1024.png" alt="LASCA Logo" className="w-8 h-8 object-contain" />
            <div>
              <h3 className="text-base font-bold text-white leading-none">LASCA Suite</h3>
              <span className="text-[11px] font-mono text-cyan-400">v1.0.0 </span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-slate-300 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <p className="leading-relaxed text-slate-400">
            Το <strong className="text-slate-100">LASCA</strong> είναι ένα εξειδικευμένο τοπογραφικό λογισμικό σχεδιασμένο για την επεξεργασία, συνόρθωση και υπολογισμό γεωδαιτικών δεδομένων.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Code2 size={15} className="text-blue-400" />
              <span>Laska Developers</span>
            </div>
            
            {/* Team List with Hover expansion */}
            <div className="space-y-2.5">
              {teamMembers.map((member, idx) => (
                <div 
                  key={idx}
                  className="group p-3 bg-slate-800/40 hover:bg-slate-800/90 rounded-xl border border-slate-800 hover:border-blue-500/40 transition-all duration-300 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                        {member.name}
                      </h5>
                      <p className="text-[11px] text-slate-400 truncate">{member.role}</p>
                    </div>
                  </div>

                  {/* Hover Details (Mail, LinkedIn, GitHub) */}
                  <div className="max-h-0 opacity-0 group-hover:max-h-20 group-hover:opacity-100 transition-all duration-300 overflow-hidden pt-0 group-hover:pt-3 flex items-center gap-3 border-t border-transparent group-hover:border-slate-700/60 mt-0 group-hover:mt-2.5">
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
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
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

        {/* Action Button */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            Κλείσιμο
          </button>
        </div>

      </div>
    </div>
  );
};

export default About;