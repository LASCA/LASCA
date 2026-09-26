import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Loader2, Share2, UserMinus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareProjectModal = ({ isOpen, onClose, projectName }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const loadMembers = async () => {
    if (!projectName) return;
    setIsLoadingMembers(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects/members`, {
        params: { project_name: projectName },
      });
      setMembers(response.data?.members || []);
    } catch (error) {
      console.error('Σφάλμα φόρτωσης μελών:', error);
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectName) {
      loadMembers();
    }
  }, [isOpen, projectName]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!projectName || !email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/projects/share`, {
        project_name: projectName,
        email: email.trim(),
      });
      toast.success(response.data?.message || `Το project κοινοποιήθηκε στον ${email.trim()}`);
      setEmail('');
      await loadMembers();
    } catch (error) {
      const message = error.response?.data?.error || 'Αποτυχία κοινοποίησης project.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberEmail) => {
    if (!projectName) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/projects/members`, {
        data: {
          project_name: projectName,
          email: memberEmail,
        },
      });
      toast.success(response.data?.message || 'Το μέλος αφαιρέθηκε επιτυχώς');
      await loadMembers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Αποτυχία αφαίρεσης μέλους');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] shadow-[0_0_30px_rgba(15,23,42,0.7)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Share2 size={18} className="text-indigo-400" />
            Κοινοποίηση: {projectName || 'Project'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-900/70 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
            />
            <button
              type="submit"
              disabled={isSubmitting || !projectName || !email.trim()}
              className="flex items-center justify-center gap-2 min-w-[120px] bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-bold px-4 py-3 rounded-xl transition-colors"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
              {isSubmitting ? '...' : 'Κοινοποίηση'}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">
              Μέλη με πρόσβαση
            </h3>

            {isLoadingMembers ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Φόρτωση...
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-slate-400">Δεν υπάρχουν άλλα μέλη για αυτό το project.</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.email} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.display_name} className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-100">
                          {member.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{member.display_name || member.email}</p>
                        <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>
                    {!member.is_owner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.email)}
                        className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        <UserMinus size={14} />
                        Αφαίρεση
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareProjectModal;
