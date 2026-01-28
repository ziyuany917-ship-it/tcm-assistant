
import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { LayoutDashboard, Sprout, User, Menu, X, HeartHandshake, MessageCircleHeart, Key, LogOut, Trash2, AlertTriangle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onLogout: () => void;
  username: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isOpen,
  setIsOpen,
  apiKey,
  setApiKey,
  onLogout,
  username
}) => {
  const [tempKey, setTempKey] = useState(apiKey);
  const [isResetting, setIsResetting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Custom Modal State for Reset
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync tempKey when apiKey prop changes (e.g. after loading from cloud)
  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const menuItems = [
    { id: View.CONSULTATION, label: '解忧草本屋 🌿', icon: <MessageCircleHeart size={22} />, color: 'hover:bg-macaron-mint text-macaron-mintDark' },
    { id: View.MIND_BODY_DASHBOARD, label: '时光碎碎念 📝', icon: <LayoutDashboard size={22} />, color: 'hover:bg-macaron-peach text-macaron-peachDark' },
    { id: View.GROWTH, label: '元气养成记 ✨', icon: <Sprout size={22} />, color: 'hover:bg-macaron-yellow text-macaron-yellowDark' },
    { id: View.PROFILE, label: '身体说明书 📖', icon: <User size={22} />, color: 'hover:bg-macaron-blue text-macaron-blueDark' },
  ];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSaveKey = () => {
    setApiKey(tempKey);
    showToast("✨ 钥匙已收好，老己准备好了！");
  };

  const handleNav = (view: View) => {
    setCurrentView(view);
    setIsOpen(false); // Close drawer after selection
  };

  const confirmHardReset = async () => {
      setIsResetting(true);
      try {
          const { error } = await supabase.from('app_users').delete().eq('username', username);
          if (error) throw error;
          showToast("数据已重置，一切归零。");
          setTimeout(onLogout, 1500);
      } catch (e: any) {
          showToast("重置失败: " + e.message);
      } finally {
          setIsResetting(false);
          setShowResetConfirm(false);
      }
  };

  return (
    <>
      {/* 1. Floating Hamburger Button (Main Trigger) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-white/60 backdrop-blur-md p-3 rounded-full shadow-sticker hover:scale-110 active:scale-95 transition-all text-warm-600 border border-white/50"
        title="打开导航"
      >
        <Menu size={24} />
      </button>

      {/* 2. Semi-transparent Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Drawer Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-[60] w-[280px] md:w-[320px] bg-paper/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out transform flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header inside Drawer */}
        <div className="h-24 flex items-center justify-between px-6 border-b border-warm-100/50">
            <div className="flex items-center space-x-2 text-warm-700">
              <div className="bg-macaron-peach p-2 rounded-full text-warm-500 shadow-sm">
                <HeartHandshake size={24} />
              </div>
              <span className="font-rounded font-bold text-xl tracking-wide text-warm-800 whitespace-nowrap italic">爱你老己</span>
            </div>
            <button 
                onClick={() => setIsOpen(false)}
                className="text-warm-400 hover:text-warm-600 p-2 rounded-full hover:bg-warm-100 transition-colors"
            >
                <X size={24} />
            </button>
        </div>

        {/* User Badge */}
        <div className="px-6 py-4">
            <div className="px-4 py-3 bg-white/50 rounded-2xl border border-warm-100 shadow-sm">
                <div className="text-[10px] text-warm-400 uppercase font-bold tracking-wider mb-1 flex items-center">
                    <div className="w-1.5 h-1.5 bg-macaron-mintDark rounded-full mr-1.5 animate-pulse"></div>
                    旅人
                </div>
                <div className="font-rounded text-warm-800 font-bold truncate text-base" title={username}>{username}</div>
            </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-2 py-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center p-4 rounded-[1.5rem] transition-all duration-300 group
                ${currentView === item.id
                  ? 'bg-gradient-to-r from-warm-200 to-warm-100 text-warm-800 shadow-sticker scale-105'
                  : `text-warm-500 bg-transparent ${item.color}`
                }
              `}
            >
              <div className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className="font-bold tracking-wide whitespace-nowrap ml-4 text-sm">
                  {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom Section: API Key & Actions */}
        <div className="p-6 space-y-4 border-t border-warm-100/50">
          {/* Key Input */}
          <div className="bg-white/50 p-4 rounded-[1.5rem] border border-warm-100 shadow-sm">
              <div className="flex items-center space-x-2 mb-2 text-warm-400">
                <Key size={14} />
                <span className="text-[10px] font-bold uppercase">Secret Key</span>
              </div>
              <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={tempKey}
                      onChange={(e) => setTempKey(e.target.value)}
                      placeholder="Google API Key..."
                      className="w-full bg-white border border-warm-100 rounded-xl px-3 py-2 pr-8 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-200 placeholder-warm-300 transition-all font-mono"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                      type="button"
                    >
                      {showKey ? <EyeOff size={12}/> : <Eye size={12}/>}
                    </button>
                  </div>
                  <button 
                    onClick={handleSaveKey}
                    className="w-full bg-warm-300 hover:bg-warm-400 text-white text-xs py-2 rounded-xl transition-all font-bold shadow-sm hover:shadow-md"
                  >
                    保存钥匙
                  </button>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
              <button 
                  onClick={onLogout}
                  className="flex-1 flex items-center justify-center p-3 rounded-[1.5rem] text-warm-500 hover:bg-warm-100 transition-all border border-warm-100 shadow-sm space-x-2"
              >
                  <LogOut size={18} />
                  <span className="font-bold text-xs">离开</span>
              </button>

              <button 
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                  className="flex-1 flex items-center justify-center p-3 rounded-[1.5rem] text-red-400 hover:bg-red-50 hover:text-red-500 transition-all border border-dashed border-red-200 hover:border-red-400 space-x-2"
              >
                  {isResetting ? <AlertTriangle size={18} className="animate-pulse"/> : <Trash2 size={18} />}
                  <span className="font-bold text-xs">自毁</span>
              </button>
          </div>
        </div>
      </aside>

      {/* 4. Global Toast for Sidebar */}
      <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[110] bg-macaron-mintDark text-white px-6 py-2 rounded-full shadow-lg transition-all duration-300 pointer-events-none flex items-center space-x-2 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <CheckCircle2 size={16} /> <span className="text-sm font-bold">{toastMsg}</span>
      </div>

      {/* 5. Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-cinematic" onClick={() => setShowResetConfirm(false)}>
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl border-4 border-white max-w-sm w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-2 bg-red-400/20"></div>
                <h3 className="text-xl font-rounded font-bold text-warm-800 mb-2 flex items-center">
                    <AlertTriangle className="text-red-400 mr-2" size={24}/> 高能预警
                </h3>
                <p className="text-warm-600 mb-6 text-sm leading-relaxed">
                    这将<strong className="text-red-500">彻底删除</strong>您的账号、日记、打卡等所有数据，且无法恢复！<br/><br/>
                    确定要自毁数据吗？
                </p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="px-5 py-2.5 text-warm-500 hover:bg-warm-50 rounded-xl text-sm font-bold transition-colors"
                    >
                        我再想想
                    </button>
                    <button 
                        onClick={confirmHardReset}
                        disabled={isResetting}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95 flex items-center"
                    >
                        {isResetting ? '销毁中...' : '确认自毁'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
