import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

interface TcmChatProps {
  profile: UserProfile;
  apiKey: string;
}

const TcmChat: React.FC<TcmChatProps> = ({ profile, apiKey }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    if (!apiKey) {
      alert("请先在侧边栏设置 Google API Key");
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const service = new GeminiService(apiKey);
      const responseText = await service.analyzeSymptom(input, profile, selectedImage || undefined);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "系统繁忙，请稍后再试。",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null); // Clear image after sending
    }
  };

  return (
    <div className="flex flex-col h-full bg-paper">
      {/* Header */}
      <div className="bg-white border-b border-tcm-200 p-4 shadow-sm">
        <h2 className="text-xl font-serif text-tcm-800 font-bold flex items-center">
          <span className="bg-tcm-100 p-1.5 rounded-full mr-2">🌿</span>
          问诊大堂
        </h2>
        <p className="text-xs text-tcm-500 mt-1">
          AI 老中医在线 • 支持舌象分析 • 基于 Gemini 1.5 Flash (via 2.5/3 Preview)
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-tcm-400 mt-20 px-6">
            <div className="text-6xl mb-4 opacity-50">🍵</div>
            <p className="text-lg font-serif mb-2">欢迎来到杏林问诊</p>
            <p className="text-sm">请描述您的症状（如：失眠、口苦），或上传舌苔照片。</p>
            <p className="text-xs mt-4 text-tcm-300">
              我会结合您的【{profile.constitution || '未知'}】体质进行分析。
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-tcm-600 text-white rounded-br-none'
                  : 'bg-white border border-tcm-100 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Uploaded tongue" 
                  className="w-full h-auto max-h-60 object-cover rounded-lg mb-3 border border-white/20"
                />
              )}
              <div className="whitespace-pre-wrap leading-relaxed font-sans text-sm md:text-base">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-tcm-100 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center space-x-2">
              <Loader2 className="animate-spin text-tcm-500" size={20} />
              <span className="text-tcm-500 text-sm">老中医正在把脉思考...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-1 text-center bg-yellow-50 text-yellow-800 text-[10px] md:text-xs">
        ⚠️ 免责声明：AI 建议仅供参考，不可替代线下专业医疗诊断。身体不适请及时就医。
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-tcm-200">
        {selectedImage && (
          <div className="flex items-center space-x-2 mb-3 bg-tcm-50 p-2 rounded-lg w-fit">
            <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded" />
            <span className="text-xs text-tcm-700">舌像已就绪</span>
            <button onClick={() => setSelectedImage(null)} className="text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-tcm-500 hover:bg-tcm-50 rounded-full transition-colors"
            title="上传舌像"
          >
            <ImageIcon size={24} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          <div className="flex-1 bg-tcm-50 rounded-2xl border-tcm-200 focus-within:ring-2 focus-within:ring-tcm-300 transition-shadow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请描述症状..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none p-3 max-h-32 text-sm text-gray-800 placeholder-tcm-300"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || (!input && !selectedImage)}
            className={`p-3 rounded-full transition-all shadow-md ${
              isLoading || (!input && !selectedImage)
                ? 'bg-tcm-200 text-white cursor-not-allowed'
                : 'bg-tcm-600 text-white hover:bg-tcm-700'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TcmChat;