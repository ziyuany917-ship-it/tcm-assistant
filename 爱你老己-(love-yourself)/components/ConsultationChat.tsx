import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, Image as ImageIcon, Loader2, Trash2, MessageCircleHeart } from 'lucide-react';

interface ConsultationChatProps {
  profile: UserProfile;
  apiKey: string;
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
}

const ConsultationChat: React.FC<ConsultationChatProps> = ({ profile, apiKey, messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      alert("请先在左侧栏底部设置 Google API Key");
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
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
      setMessages([...updatedMessages, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "老己暂时无法回答，请检查网络或Key。",
        timestamp: Date.now()
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto md:p-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur p-6 rounded-t-[2.5rem] shadow-sm border-b border-warm-100 flex items-center justify-between z-10">
        <h2 className="text-xl font-rounded text-warm-800 font-bold flex items-center">
          <span className="bg-macaron-mint p-2 rounded-full mr-3 text-macaron-mintDark"><MessageCircleHeart size={20} /></span>
          解忧草本屋 🌿
        </h2>
        <span className="text-xs text-macaron-mintDark bg-macaron-mint/30 px-3 py-1.5 rounded-full font-bold border border-macaron-mint">
            {profile.constitution ? `${profile.constitution}体质` : '体质未知'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-macaron-mint/10 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center text-warm-400 mt-20 px-6 animate-cinematic">
            <div className="text-6xl mb-6 opacity-40 grayscale">🌿</div>
            <p className="text-xl font-rounded mb-2 font-bold text-warm-600">哪里不舒服吗？</p>
            <p className="text-sm opacity-70">拍个舌苔，或者说说症状。<br/>老己会翻翻《伤寒论》帮你看。</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] rounded-[1.5rem] p-5 shadow-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-macaron-mintDark text-white rounded-br-none'
                  : 'bg-white border-2 border-white text-warm-800 rounded-bl-none'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="Uploaded" className="w-full h-auto max-h-60 object-cover rounded-xl mb-3 border-2 border-white/30"/>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border-2 border-white rounded-[1.5rem] rounded-bl-none p-4 shadow-sm flex items-center space-x-2">
              <Loader2 className="animate-spin text-macaron-mintDark" size={18} />
              <span className="text-warm-500 text-sm font-bold">正在翻阅典籍...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 rounded-b-[2.5rem] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
        {selectedImage && (
          <div className="flex items-center space-x-2 mb-3 bg-macaron-mint/20 p-2 rounded-xl w-fit">
            <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-white" />
            <button onClick={() => setSelectedImage(null)} className="text-warm-400 hover:text-red-400 bg-white rounded-full p-1"><Trash2 size={14} /></button>
          </div>
        )}
        <div className="flex items-end space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-macaron-mintDark bg-macaron-mint/30 hover:bg-macaron-mint rounded-full transition-colors"
          >
            <ImageIcon size={24} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden"/>
          
          <div className="flex-1 bg-warm-50 rounded-[1.5rem] border-2 border-transparent focus-within:border-macaron-mint transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="请描述症状..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none p-3 max-h-32 text-sm text-warm-800 placeholder-warm-300 font-medium"
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
            className={`p-3 rounded-full transition-all shadow-md hover:scale-110 active:scale-95 ${
              isLoading || (!input && !selectedImage)
                ? 'bg-warm-200 text-white cursor-not-allowed'
                : 'bg-macaron-mintDark text-white hover:shadow-lg'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationChat;