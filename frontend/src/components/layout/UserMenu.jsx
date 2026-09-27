import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { TOPBAR_ITEM, TOPBAR_NEUTRAL } from './topbar';
import { ChevronDown, LogOut, Share2, User } from 'lucide-react';
import toast from 'react-hot-toast';

const UserMenu = ({ currentProject, onOpenShareProject }) => {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [currentUser?.avatar_url]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!currentUser) return 'Χρήστης';
    return currentUser.display_name || currentUser.email?.split('@')[0] || 'Χρήστης';
  }, [currentUser]);

  const initials = useMemo(() => {
    const base = displayName.trim();
    if (!base) return 'U';
    return base.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  }, [displayName]);

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleShareClick = () => {
    setMenuOpen(false);
    if (onOpenShareProject) {
      onOpenShareProject();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Αποσυνδεθήκατε επιτυχώς');
      navigate('/', { replace: true });
    } catch {
      toast.error('Αποτυχία αποσύνδεσης');
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        title={displayName}
        className={`${TOPBAR_ITEM} ${TOPBAR_NEUTRAL} max-w-[220px] px-1.5 md:px-3`}
      >
        {!currentUser?.avatar_url || avatarFailed ? (
          <div className="w-6 h-6 shrink-0 rounded-full bg-slate-700 text-[10px] font-bold text-slate-100 flex items-center justify-center border border-slate-600">
            {initials}
          </div>
        ) : (
          <img
            src={currentUser.avatar_url}
            alt={displayName}
            className="w-6 h-6 shrink-0 object-cover rounded-full border border-slate-600"
            onError={() => setAvatarFailed(true)}
          />
        )}
        <span className="hidden md:inline truncate max-w-[140px]">{displayName}</span>
        <ChevronDown size={14} className={`hidden md:block shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700/60 bg-slate-950/95 shadow-2xl backdrop-blur-sm overflow-hidden z-[70]">
          <button
            type="button"
            onClick={handleProfileClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <User size={15} className="text-slate-300" />
            Προφίλ
          </button>
          <button
            type="button"
            onClick={handleShareClick}
            disabled={!currentProject}
            title={!currentProject ? 'Επίλεξε πρώτα project' : ''}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/80 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Share2 size={15} className="text-slate-300" />
            Κοινοποίηση Project
          </button>
          <div className="border-t border-slate-800/80" />
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-300 hover:bg-slate-800/80 transition-colors"
          >
            <LogOut size={15} className="text-rose-300" />
            Αποσύνδεση
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
