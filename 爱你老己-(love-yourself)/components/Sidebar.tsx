import React, { useState } from 'react';
import { View } from '../types';
import { LayoutDashboard, Sprout, User, Menu, ChevronLeft, HeartHandshake, MessageCircleHeart, Key, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onLogout: () => void;
  username: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isCollapsed,
  setIsCollapsed,
  apiKey,
  setApiKey,
  onLogout,
  username
}) => {
  const [tempKey, setTempKey] = useState(apiKey);

  const menuItems = [
    { id: View.CONSULTATION, label: '解忧草本屋 🌿', icon: <MessageCircleHeart size={22} />, color: 'hover:bg-macaron-mint text-macaron-mintDark' },
    { id: View.MIND_BODY_DASHBOARD, label: '时光碎碎念 📝', icon: <LayoutDashboard size={22} />, color: 'hover:bg-macaron-peach text-macaron-peachDark' },
    { id: View.GROWTH, label: '元气养成记 ✨', icon: <Sprout size={22} />, color: 'hover:bg-macaron-yellow text-macaron-yellowDark' },
    { id: View.PROFILE, label: '身体说明书 📖', icon: <User size={22} />, color: 'hover:bg-macaron-blue text-macaron-blueDark' },
  ];

  const handleSaveKey = () => {
    setApiKey(tempKey);
    alert("✨ 钥匙已收好，老己准备好了！");
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-white/80 backdrop-blur-md border-r border-warm-100 transition-all duration-500 ease-in-out flex flex-col shadow-sticker
        ${isCollapsed ? 'w-24' : 'w-72'} rounded-r-[3rem] my-4 ml-4 h-[calc(100vh-2rem)]
      `}
    >
      {/* Header */}
      <div className="h-24 flex items-center justify-between px-6">
        {!isCollapsed && (
          <div className="flex items-center space-x-2 text-warm-700 animate-cinematic">
             <div className="bg-macaron-peach p-2 rounded-full text-warm-500">
               <HeartHandshake size={24} />
             </div>
             <span className="font-rounded font-bold text-xl tracking-wide text-warm-800 whitespace-nowrap">爱你老己</span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`text-warm-400 hover:text-warm-600 p-2 rounded-full hover:bg-warm-100 transition-all duration-300 ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <Menu size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>

      {/* User Info (Mini) */}
      {!isCollapsed && (
          <div className="mx-6 px-4 py-3 bg-macaron-cream rounded-2xl border border-warm-100 mb-4 shadow-sm">
              <div className="text-[10px] text-warm-400 uppercase font-bold tracking-wider mb-1">当前旅人</div>
              <div className="font-rounded text-warm-800 font-bold truncate text-lg" title={username}>{username}</div>
          </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-4 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            title={isCollapsed ? item.label : ''}
            className={`w-full flex items-center p-4 rounded-[1.5rem] transition-all duration-300 group relative overflow-hidden
              ${currentView === item.id
                ? 'bg-gradient-to-r from-warm-200 to-warm-100 text-warm-800 shadow-sticker scale-105'
                : `text-warm-500 bg-transparent ${item.color}`
              }
              ${isCollapsed ? 'justify-center' : 'space-x-4'}
            `}
          >
            <div className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            {!isCollapsed && (
              <span className="font-bold tracking-wide whitespace-nowrap overflow-hidden text-sm">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* API Key & Logout Section (Bottom) */}
      <div className={`p-6 transition-all duration-300 flex flex-col space-y-4`}>
        {/* Key Input */}
        <div className={`${isCollapsed ? 'hidden' : 'block'} bg-white/50 p-4 rounded-[1.5rem] border border-warm-100 shadow-sm`}>
            <div className="flex items-center space-x-2 mb-2 text-warm-400">
            <Key size={14} />
            <span className="text-[10px] font-bold uppercase">Secret Key</span>
            </div>
            <div className="space-y-2">
                <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Google API Key..."
                className="w-full bg-white border border-warm-100 rounded-xl px-3 py-2 text-xs text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-200 placeholder-warm-300 transition-all"
                />
                <button 
                onClick={handleSaveKey}
                className="w-full bg-warm-300 hover:bg-warm-400 text-white text-xs py-2 rounded-xl transition-all font-bold shadow-sm hover:shadow-md"
                >
                保存
                </button>
            </div>
        </div>

        {/* Logout Button */}
        <button 
            onClick={onLogout}
            title="Logout"
            className={`w-full flex items-center justify-center p-3 rounded-[1.5rem] text-warm-500 hover:bg-red-50 hover:text-red-400 transition-all border border-transparent hover:border-red-100 ${!isCollapsed && 'space-x-2'}`}
        >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-bold text-sm">离开一会儿</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;