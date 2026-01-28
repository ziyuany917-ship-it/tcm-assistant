
import React, { useState } from 'react';
import { Sparkles, Key, ArrowRight, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose }) => {
  const [inputKey, setInputKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputKey.trim()) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-cinematic">
      {/* 1. Backdrop: Blur & Darken */}
      <div 
        className="absolute inset-0 bg-warm-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* 2. Modal Card: Creamy, Rounded, Floating */}
      <div className="relative bg-[#FEF9E7] w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border-4 border-white transform transition-all scale-100 overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-macaron-yellow/40 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-macaron-mint/30 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 p-2 text-warm-300 hover:text-warm-500 hover:bg-warm-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          {/* Icon */}
          <div className="bg-white p-4 rounded-full shadow-sticker mb-6 animate-float">
            <Sparkles className="text-macaron-yellowDark" size={32} />
          </div>

          {/* Title & Text */}
          <h3 className="text-2xl font-rounded font-bold text-warm-800 mb-3">
            开启灵性连接
          </h3>
          <p className="text-warm-500 text-sm leading-relaxed mb-8 px-4">
            想要获得 AI 老中医的智慧指引、深度觉察与复盘分析，需要先配置您的 API Key 哦~
          </p>

          {/* Input Area */}
          <div className="w-full space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key size={18} className="text-warm-400 group-focus-within:text-macaron-blueDark transition-colors"/>
              </div>
              <input 
                autoFocus
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="请输入您的 API Key"
                className="w-full bg-white border-2 border-warm-100 text-warm-800 text-sm rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-macaron-blueDark focus:ring-4 focus:ring-macaron-blue/10 transition-all font-mono placeholder-warm-300 shadow-inner"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={!inputKey.trim()}
              className="w-full bg-macaron-blueDark hover:bg-blue-700 disabled:bg-warm-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>保存并继续</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <p className="mt-6 text-[10px] text-warm-300">
            您的密钥仅存储在本地浏览器，安全且私密。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
