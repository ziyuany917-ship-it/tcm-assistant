
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
import { Save, User, Activity, FileText, AlertCircle, MessageCircle, Loader2, X, CheckCircle2 } from 'lucide-react';

interface UserProfileFormProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  apiKey: string;
  onSave?: () => Promise<void>;
  onRequireAuth: (callback: () => void) => void;
}

const UserProfileForm: React.FC<UserProfileFormProps> = ({ profile, setProfile, apiKey, onSave, onRequireAuth }) => {
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisChat, setDiagnosisChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (showDiagnosisModal && messagesEndRef.current) {
         messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
     }
  }, [diagnosisChat, showDiagnosisModal]);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleBlur = () => {
      if (onSave) {
          onSave().catch(e => console.error("Auto-save failed", e));
      }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleManualSave = async () => {
    if (onSave) {
        setIsSaving(true);
        try {
            await onSave();
            showToast('✨ 身体说明书已永久保存！');
        } catch (e) {
            showToast('❌ 保存失败，请检查网络');
        } finally {
            setIsSaving(false);
        }
    }
  };

  // Intercepted Action
  const startDiagnosis = () => {
     onRequireAuth(() => {
        setShowDiagnosisModal(true);
        if (diagnosisChat.length === 0) {
            const initialMsg: ChatMessage = {
                id: 'init', 
                role: 'model', 
                content: "您好，我是您的中医体质辨识专家。我们将通过几轮问答来确定您的体质类型（如气虚、湿热等）。\n\n请注意：诊断过程中我不会提供饮食建议，只专注于诊断。\n\n首先，请问您平时是怕冷多一些，还是怕热多一些？（或者手脚容易冰凉吗？）", 
                timestamp: Date.now()
            };
            setDiagnosisChat([initialMsg]);
        }
     });
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
          const response = await service.chatDiagnosis(newHistory, profile);
          
          let displayContent = response;
          let profileUpdated = false;

          const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (jsonMatch) {
              try {
                  const cmd = JSON.parse(jsonMatch[1]);
                  if (cmd.UPDATE_PROFILE && cmd.UPDATE_PROFILE.constitution) {
                      const newConstitution = cmd.UPDATE_PROFILE.constitution;
                      
                      const updatedProfile = { ...profile, constitution: newConstitution };
                      setProfile(updatedProfile); 
                      if (onSave) setTimeout(() => onSave(), 500);

                      displayContent = response.replace(/```json[\s\S]*?```/, '').trim();
                      profileUpdated = true;
                  }
              } catch (e) { console.error("Failed to parse diagnosis command", e); }
          }

          const modelMsg: ChatMessage = {
              id: (Date.now()+1).toString(), role: 'model', content: displayContent, timestamp: Date.now()
          };
          setDiagnosisChat([...newHistory, modelMsg]);

          if (profileUpdated) showToast("🎉 档案已自动更新！并已同步至云端。");

      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const inputClass = "w-full bg-warm-50 border-2 border-warm-100 rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-blue focus:bg-white focus:shadow-md hover:border-macaron-blue/50 hover:bg-white transition-all duration-300 font-medium";
  const textareaClass = "w-full bg-warm-50 border-2 border-warm-100 rounded-xl p-3 text-warm-800 focus:outline-none focus:border-macaron-peachDark focus:bg-white focus:shadow-md hover:border-macaron-peachDark/50 hover:bg-white transition-all duration-300 font-medium resize-none";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto h-full overflow-y-auto no-scrollbar relative bg-paper">
       <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-macaron-blueDark text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center space-x-2 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <CheckCircle2 size={16} className="shrink-0" /> <span className="text-sm font-bold whitespace-nowrap">{toastMsg}</span>
       </div>

       <header className="mb-8 flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-rounded font-bold text-warm-800 flex items-center">
                <User className="mr-3 text-macaron-blueDark" />
                身体说明书 📖
            </h2>
            <p className="text-warm-500 text-sm mt-1 ml-10">了解自己，是爱自己的第一步</p>
        </div>
        <button 
            onClick={handleManualSave}
            disabled={isSaving}
            className="bg-macaron-blueDark hover:bg-blue-700 text-white px-6 py-2 rounded-2xl flex items-center shadow-sticker transition-all hover:scale-105 font-bold disabled:opacity-70 disabled:scale-100"
        >
            {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2"/>}
            {isSaving ? '正在云端存储...' : '保存更新'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sticker border-2 border-white">
                  <h3 className="text-lg font-bold text-warm-800 mb-6 border-b-2 border-macaron-blue/20 pb-2">基本信息</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">昵称</label>
                          <input value={profile.name || ''} onChange={e => handleChange('name', e.target.value)} onBlur={handleBlur} className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">年龄</label>
                              <input value={profile.age || ''} onChange={e => handleChange('age', e.target.value)} onBlur={handleBlur} className={inputClass} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2">性别</label>
                              <select value={profile.gender || ''} onChange={e => handleChange('gender', e.target.value)} onBlur={handleBlur} className={inputClass} >
                                  <option value="">选择</option>
                                  <option value="male">男</option>
                                  <option value="female">女</option>
                              </select>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2rem] shadow-sticker border-2 border-white">
                  <h3 className="text-lg font-bold text-warm-800 mb-6 border-b-2 border-macaron-peach/20 pb-2 flex items-center justify-between">
                      <span>体质与病史</span>
                      <button onClick={startDiagnosis} className="text-xs bg-macaron-peachDark text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors shadow-sm flex items-center font-bold animate-pulse">
                          <MessageCircle size={12} className="mr-1"/> 检测体质
                      </button>
                  </h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center"><Activity size={14} className="mr-1 text-macaron-peachDark"/> 中医体质</label>
                          <input value={profile.constitution || ''} onChange={e => handleChange('constitution', e.target.value)} onBlur={handleBlur} placeholder="如：痰湿质、气虚质" className={inputClass} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center"><FileText size={14} className="mr-1 text-macaron-peachDark"/> 病史/症状</label>
                          <textarea value={profile.history || ''} onChange={e => handleChange('history', e.target.value)} onBlur={handleBlur} className={`${textareaClass} h-24`} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-warm-400 uppercase mb-2 pl-2 flex items-center"><AlertCircle size={14} className="mr-1 text-macaron-peachDark"/> 过敏源</label>
                          <input value={profile.allergies || ''} onChange={e => handleChange('allergies', e.target.value)} onBlur={handleBlur} className={inputClass} />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {showDiagnosisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border-4 border-white flex flex-col h-[600px] animate-cinematic overflow-hidden relative">
                  <div className="p-4 border-b border-warm-50 bg-warm-50/50 flex justify-between items-center">
                      <h3 className="font-rounded font-bold text-warm-800 flex items-center"><MessageCircle className="mr-2 text-macaron-peachDark"/> 体质辨识专家</h3>
                      <button onClick={() => setShowDiagnosisModal(false)} className="bg-white p-2 rounded-full text-warm-400 hover:text-red-400 shadow-sm transition-transform hover:rotate-90"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-macaron-cream/30">
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
                                  <span className="text-xs text-warm-400 font-bold">正在诊断...</span>
                              </div>
                          </div>
                      )}
                      <div ref={messagesEndRef}/>
                  </div>

                  <div className="p-4 border-t border-warm-50 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                       <div className="flex space-x-2">
                           <input autoFocus value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="请描述您的感受..." className="flex-1 bg-warm-50 border-2 border-transparent rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-macaron-peachDark transition-colors" onKeyDown={e => e.key === 'Enter' && sendChat()} />
                           <button onClick={sendChat} disabled={isLoading || !chatInput.trim()} className="bg-macaron-peachDark text-white px-6 rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:bg-warm-200 font-bold shadow-md transition-all active:scale-95">回复</button>
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default UserProfileForm;
