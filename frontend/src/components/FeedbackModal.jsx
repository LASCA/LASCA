import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { 
  X, 
  Send, 
  AlertCircle, 
  Lightbulb, 
  MessageSquare, 
  MessageCircle,
  Paperclip, 
  Loader2, 
  CheckCircle2, 
  Undo2,
  Image as ImageIcon
} from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'bug', // bug | feature | general
    email: '',
    message: '',
    file: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setFormData({ type: 'bug', email: '', message: '', file: null });
      setIsSuccess(false);
      setSubmitError('');
    }, 300);
  };

  if (!isOpen) return null;

  const handleTypeChange = (type) => setFormData({ ...formData, type });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, file: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return;
    
    setIsSubmitting(true);
    setSubmitError('');

    const payload = new FormData();
    payload.append('type', formData.type);
    payload.append('email', formData.email);
    payload.append('message', formData.message);
    if (formData.file) {
      payload.append('screenshot', formData.file);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        body: payload,
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Η αποστολή απέτυχε.');
      }
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(error.message || 'Η αποστολή απέτυχε.');
    }
  };

  const getPlaceholder = () => {
    switch(formData.type) {
      case 'bug': return "Περιγράψτε το σφάλμα και πώς να το αναπαράγουμε...";
      case 'feature': return "Τι θα θέλατε να δείτε σε επόμενη έκδοση του LASCA;";
      case 'general': return "Μοιραστείτε τις σκέψεις ή τα σχόλιά σας μαζί μας...";
      default: return "Γράψτε το μήνυμά σας...";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div 
        className="bg-[#0f111a] border border-slate-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-[#0f111a]">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2.5 tracking-wide">
            <MessageSquare size={20} className="text-indigo-400" />
            Επικοινωνία
          </h2>
          <button 
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Η αναφορά σας στάλθηκε!</h3>
              <p className="text-sm text-slate-400 mt-1">
                Σας ευχαριστούμε για το χρόνο που διαθέσατε.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            
            {/* 3 Κατηγορίες Αναφοράς */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('bug')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                  formData.type === 'bug' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <AlertCircle size={16} /> Σφάλμα
              </button>
              
              <button
                type="button"
                onClick={() => handleTypeChange('feature')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                  formData.type === 'feature' 
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Lightbulb size={16} /> Πρόταση
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('general')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                  formData.type === 'general' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <MessageCircle size={16} /> Σχόλια
              </button>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[11px] font-bold text-slate-400 tracking-wider">
                Email Επικοινωνιας
              </label>
              <input 
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
                placeholder="Για να σας απαντήσουμε..."
              />
            </div>

            {/* Μήνυμα */}
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-[11px] font-bold text-slate-400 tracking-wider">
                Περιγραφη *
              </label>
              <textarea 
                id="message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none shadow-inner custom-scrollbar"
                placeholder={getPlaceholder()}
              />
            </div>

            {submitError && (
              <p className="text-xs text-red-400" role="alert">{submitError}</p>
            )}

            {/* Icon-only Toolbar */}
            <div className="flex items-center justify-between pt-2">
              
              {/* Left Side: Attachment */}
              <div className="flex items-center gap-3">
                {!formData.file ? (
                  <label 
                    title="Επισύναψη Στιγμιότυπου"
                    className="flex items-center justify-center w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all text-slate-400 hover:text-indigo-400"
                  >
                    <Paperclip size={18} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <ImageIcon size={16} className="text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-indigo-300 truncate max-w-[120px]">
                      {formData.file.name}
                    </span>
                    <button 
                      type="button" 
                      onClick={removeFile}
                      className="p-1 text-indigo-400/70 hover:text-red-400 transition-colors ml-1"
                      title="Αφαίρεση αρχείου"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  title="Ακύρωση"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                >
                  <Undo2 size={18} />
                </button>
                
                <button 
                  title="Αποστολή"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.message.trim()}
                  className="flex items-center justify-center w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;