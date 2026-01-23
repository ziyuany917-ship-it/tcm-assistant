import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
import { Save, User, Activity, FileText, AlertCircle, MessageCircle, Loader2, X } from 'lucide-react';

interface UserProfileFormProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  apiKey: string;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({ profile, setProfile, apiKey }) => {
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisChat, setDiagnosisChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (showDiagnosisModal && messagesEndRef.current) {
         messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
     }
  }, [diagnosisChat, showDiagnosisModal]);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setProfile(localProfile);
    alert('✨ 身体说明书已更新！');
  };

  const startDiagnosis = () => {
     if (!apiKey) return alert("Key 还没设置呢~");
     setShowDiagnosisModal(true);
     if (diagnosisChat.length === 0) {
         const initialMsg: ChatMessage = {
             id: 'init', role: 'model', content: "你好呀，我是你的AI中医调理师。为了确认你的体质，我需要问几个问题。请问你平时怕冷还是怕热？", timestamp: Date.now()
         };
         setDiagnosisChat([initialMsg]);
     }
  };

  const sendChat = async () => {
      if (!chatInput.trim() || !apiKey) return;
      
      const userMsg: ChatMessage = {
          id: Date.now().toString(), role: 'user', content: chatInput, timestamp: Date.now()
      };
      const newHistory = [...diagnosisChat, userMsg];
      setDiagnosisChat(newHistory);
      setChatInput('');
      setIsLoading(true);

      try {
          const service = new GeminiService(apiKey);
          const response = await service.chatDiagnosis(newHistory, localProfile);
          
          const modelMsg: ChatMessage = {
              id: (Date.now()+1).toString(), role: 'model', content: response, timestamp: Date.now()
          };
          setDiagnosisChat([...newHistory, modelMsg]);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-full overflow-y-auto no-scrollbar relative bg-paper">
       <header className="mb-8 flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-rounded font-bold text-warm-800 flex items-center">
                <User className="mr-3 text-macaron-blueDark" />
                身体说明书 📖
            </h2>
            <p className="text-warm-500 text-sm mt-1 ml-10">了解自己，是爱自己的第一步</p>
        </div>
        <button 
            onClick={handleSave}
            className="bg-macaron-blueDark hover:bg-blue-700 text-white px-6 py-2 rounded-2xl flex items-center shadow-sticker transition-all hover:scale-105 font-bold"
        >
            <Save size={18} className="mr-2"/> 保存更新
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Fields - Left */}
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sticker border-2 border-white">
                  <h3 className="text-lg font-bold text-warm-800 mb-6 border-b-2 border-macaron-blue/20 pb-2">基本信息</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">昵称</label>
                          <input 
                            value={localProfile.name} 
                            onChange={e => handleChange('name', e.target.value)}
                            className="w-full bg-macaron-blue/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-blue transition-colors font-medium"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">年龄</label>
                              <input 
                                value={localProfile.age} 
                                onChange={e => handleChange('age', e.target.value)}
                                className="w-full bg-macaron-blue/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-blue transition-colors font-medium"
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">性别</label>
                              <select 
                                value={localProfile.gender} 
                                onChange={e => handleChange('gender', e.target.value)}
                                className="w-full bg-macaron-blue/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-blue transition-colors font-medium"
                              >
                                  <option value="">选择</option>
                                  <option value="male">男</option>
                                  <option value="female">女</option>
                              </select>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Form Fields - Right */}
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sticker border-2 border-white">
                  <h3 className="text-lg font-bold text-warm-800 mb-6 border-b-2 border-macaron-peach/20 pb-2 flex items-center justify-between">
                      <span>体质与病史</span>
                      <button 
                        onClick={startDiagnosis} 
                        className="text-xs bg-macaron-peachDark text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors shadow-sm flex items-center font-bold"
                      >
                          <MessageCircle size={12} className="mr-1"/> AI 辨识
                      </button>
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center">
                              <Activity size={14} className="mr-1 text-macaron-peachDark"/> 中医体质
                          </label>
                          <input 
                            value={localProfile.constitution} 
                            onChange={e => handleChange('constitution', e.target.value)}
                            placeholder="如：痰湿质、气虚质"
                            className="w-full bg-macaron-peach/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-peachDark transition-colors font-medium"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center">
                              <FileText size={14} className="mr-1 text-macaron-peachDark"/> 病史/症状
                          </label>
                          <textarea 
                            value={localProfile.history} 
                            onChange={e => handleChange('history', e.target.value)}
                            className="w-full bg-macaron-peach/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-peachDark transition-colors font-medium h-24 resize-none"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center">
                              <AlertCircle size={14} className="mr-1 text-macaron-peachDark"/> 过敏源
                          </label>
                          <input 
                            value={localProfile.allergies} 
                            onChange={e => handleChange('allergies', e.target.value)}
                            className="w-full bg-macaron-peach/10 border-2 border-transparent rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-peachDark transition-colors font-medium"
                          />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Diagnosis Modal */}
      {showDiagnosisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border-4 border-white flex flex-col h-[600px] animate-cinematic overflow-hidden">
                  <div className="p-4 border-b border-warm-50 bg-macaron-peach/10 flex justify-between items-center">
                      <h3 className="font-rounded font-bold text-warm-800 flex items-center">
                          <MessageCircle className="mr-2 text-macaron-peachDark"/> 体质辨识小剧场
                      </h3>
                      <button onClick={() => setShowDiagnosisModal(false)} className="bg-white p-2 rounded-full text-warm-400 hover:text-red-400 shadow-sm">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-warm-50/30">
                      {diagnosisChat.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                                  msg.role === 'user' ? 'bg-macaron-peachDark text-white rounded-br-none shadow-md' : 'bg-white border-2 border-white text-warm-800 rounded-bl-none shadow-sm'
                              }`}>
                                  {msg.content}
                              </div>
                          </div>
                      ))}
                      {isLoading && (
                          <div className="flex justify-start">
                              <div className="bg-white border-2 border-white p-3 rounded-2xl rounded-bl-none flex items-center space-x-2">
                                  <Loader2 className="animate-spin text-macaron-peachDark" size={14}/>
                                  <span className="text-xs text-warm-400 font-bold">老中医思考中...</span>
                              </div>
                          </div>
                      )}
                      <div ref={messagesEndRef}/>
                  </div>

                  <div className="p-4 border-t border-warm-50 bg-white">
                       <div className="flex space-x-2">
                           <input 
                              value={chatInput}
                              onChange={e => setChatInput(e.target.value)}
                              placeholder="请如实回答..."
                              className="flex-1 bg-warm-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-macaron-peach"
                              onKeyDown={e => e.key === 'Enter' && sendChat()}
                           />
                           <button onClick={sendChat} disabled={isLoading} className="bg-macaron-peachDark text-white px-6 rounded-xl hover:bg-red-600 disabled:opacity-50 font-bold shadow-sm">
                               发送
                           </button>
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default UserProfileForm;