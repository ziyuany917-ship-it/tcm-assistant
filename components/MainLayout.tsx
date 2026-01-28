
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import HealthMindLog from './HealthMindLog';
import GrowthTracks from './GrowthTracks';
import UserProfileForm from './UserProfileForm';
import ConsultationChat from './ConsultationChat';
import AwarenessSpace from './AwarenessSpace';
import ApiKeyModal from './ApiKeyModal';
import { View, UserProfile, DailyLog, DoneItem, ChatMessage, Habit } from '../types';
import { supabase } from '../services/supabaseClient';
import { Loader2, CloudCog, CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';

interface MainLayoutProps {
  username: string;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ username, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>(View.CONSULTATION);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Sync States ---
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Data States ---
  const [apiKey, setApiKey] = useState('');
  
  // --- Auth Interception State ---
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>({ 
      name: username, age: '', gender: '', constitution: '', history: '', allergies: '', goals: '' 
  });
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [doneItems, setDoneItems] = useState<DoneItem[]>([]);
  const [consultationMessages, setConsultationMessages] = useState<ChatMessage[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  // --- Refs ---
  const profileRef = useRef(profile);
  const logsRef = useRef(logs);
  const doneItemsRef = useRef(doneItems);
  const habitsRef = useRef(habits);
  const consultationRef = useRef(consultationMessages);
  const apiKeyRef = useRef(apiKey);

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { doneItemsRef.current = doneItems; }, [doneItems]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);
  useEffect(() => { consultationRef.current = consultationMessages; }, [consultationMessages]);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

  const [isAwarenessMode, setIsAwarenessMode] = useState(false);

  // --- Load Data ---
  useEffect(() => {
    let isMounted = true;
    const loadUserData = async (retries = 3) => {
      try {
        setLoadError(null);
        console.log(`📥 Loading data for: ${username}`);
        if (retries === 3) await new Promise(r => setTimeout(r, 500));

        const { data, error } = await supabase.from('app_users').select('*').eq('username', username).single();

        if (error) {
            const isNetworkError = error.code === '57014' || error.message.includes('fetch') || error.message.includes('network');
            if (isNetworkError && retries > 0) {
                if (!isMounted) return;
                setLoadError("正在尝试重新连接数据库...");
                await new Promise(r => setTimeout(r, 2000));
                return loadUserData(retries - 1);
            }
            if (error.code !== 'PGRST116') throw error;
        }

        if (!isMounted) return;

        if (data) {
          if (data.profile) setProfile(prev => ({ ...prev, ...data.profile }));
          if (Array.isArray(data.daily_logs)) setLogs(data.daily_logs);
          if (Array.isArray(data.done_items)) setDoneItems(data.done_items);
          if (Array.isArray(data.consultation_history)) setConsultationMessages(data.consultation_history);
          if (data.habits && Array.isArray(data.habits) && data.habits.length > 0) {
              setHabits(data.habits);
          } else {
              setHabits([{ id: '1', name: '早睡 (23:00)', history: {} }, { id: '2', name: '阅读 30分', history: {} }, { id: '3', name: '八段锦/运动', history: {} }]);
          }
          if (data.settings?.apiKey) setApiKey(data.settings.apiKey);
        } else {
             setHabits([{ id: '1', name: '早睡 (23:00)', history: {} }, { id: '2', name: '阅读 30分', history: {} }, { id: '3', name: '八段锦/运动', history: {} }]);
        }
        setIsDataLoaded(true);
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e.message || "数据加载超时");
      }
    };
    loadUserData();
    return () => { isMounted = false; };
  }, [username]);

  // --- Save Data ---
  const saveDataToCloud = async () => {
      if (!isDataLoaded) return;
      setIsSyncing(true);
      setSaveError(null);
      const updatePayload = {
          profile: profileRef.current,
          daily_logs: logsRef.current,
          done_items: doneItemsRef.current,
          consultation_history: consultationRef.current,
          habits: habitsRef.current,
          settings: { apiKey: apiKeyRef.current },
          last_updated: new Date().toISOString()
      };
      try {
          const { error } = await supabase.from('app_users').update(updatePayload).eq('username', username);
          if (error && error.code !== '57014') setSaveError("云端同步失败");
      } catch (e) { setSaveError("网络异常"); } 
      finally { setIsSyncing(false); }
  };

  useEffect(() => {
     if (!isDataLoaded) return;
     const timer = setTimeout(() => saveDataToCloud(), 3000);
     return () => clearTimeout(timer);
  }, [profile, logs, doneItems, consultationMessages, apiKey, habits, isDataLoaded]);

  // --- Core Interception Logic ---
  const handleRequireAuth = (callback: () => void) => {
    if (apiKey) {
        callback();
    } else {
        setPendingAction(() => callback);
        setIsKeyModalOpen(true);
    }
  };

  const handleSaveKeyFromModal = (newKey: string) => {
      setApiKey(newKey);
      setIsKeyModalOpen(false);
      // Execute the pending action if it exists
      if (pendingAction) {
          // Use setTimeout to allow state (apiKey) to update first, 
          // although Refs handle this, it's safer for React batched updates
          setTimeout(() => {
              pendingAction();
              setPendingAction(null);
          }, 100);
      }
      // Trigger an immediate save to persist the key
      setTimeout(() => saveDataToCloud(), 500);
  };

  const handleAwarenessClose = (summary: string) => {
      const newLog: DailyLog = { id: Date.now().toString(), date: new Date().toLocaleDateString('zh-CN'), content: summary, type: 'meditation', timestamp: Date.now() };
      setLogs([newLog, ...logs]);
      setIsAwarenessMode(false);
  };

  const renderContent = () => {
    if (!isDataLoaded) return (
        <div className="flex h-full flex-col items-center justify-center text-warm-500 bg-warm-50 p-6 text-center">
            {loadError ? (
                <div className="flex flex-col items-center animate-cinematic">
                    <AlertTriangle size={48} className="text-macaron-peachDark mb-4"/>
                    <h3 className="text-xl font-bold text-warm-800 mb-2">连接老己有点慢...</h3>
                    <p className="text-warm-500 mb-6 text-sm max-w-xs">{loadError === "数据加载超时" ? "数据库正在从休眠中唤醒，请稍等几秒再试。" : loadError}</p>
                    <button onClick={() => window.location.reload()} className="bg-macaron-blueDark text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center"><RefreshCw size={18} className="mr-2"/> 重新加载</button>
                </div>
            ) : (
                <>
                    <Loader2 className="animate-spin mb-4 text-macaron-peachDark" size={40}/>
                    <p className="font-rounded font-bold text-lg animate-pulse">正在唤醒老己的记忆...</p>
                    <p className="text-xs text-warm-300 mt-2">如果是初次连接，可能需要 10-20 秒</p>
                </>
            )}
        </div>
    );

    const commonProps = { apiKey, profile };

    switch (currentView) {
      case View.CONSULTATION:
        return <ConsultationChat {...commonProps} messages={consultationMessages} setMessages={setConsultationMessages} logs={logs} setLogs={setLogs} onRequireAuth={handleRequireAuth} />;
      case View.MIND_BODY_DASHBOARD:
        return <HealthMindLog logs={logs} setLogs={setLogs} doneItems={doneItems} setDoneItems={setDoneItems} {...commonProps} onEnterAwareness={() => setIsAwarenessMode(true)} onRequireAuth={handleRequireAuth} />;
      case View.GROWTH:
        return <GrowthTracks apiKey={apiKey} doneItems={doneItems} setDoneItems={setDoneItems} habits={habits} setHabits={setHabits} profile={profile} setProfile={setProfile} logs={logs} onRequireAuth={handleRequireAuth} />;
      case View.PROFILE:
        return <UserProfileForm profile={profile} setProfile={setProfile} apiKey={apiKey} onSave={saveDataToCloud} onRequireAuth={handleRequireAuth} />;
      default:
        return <ConsultationChat {...commonProps} messages={consultationMessages} setMessages={setConsultationMessages} logs={logs} setLogs={setLogs} onRequireAuth={handleRequireAuth} />;
    }
  };

  return (
    <div className="flex h-screen bg-warm-50 overflow-hidden font-sans text-warm-900 selection:bg-warm-200 relative">
      {/* The Just-in-Time Modal */}
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onSave={handleSaveKeyFromModal} 
        onClose={() => { setIsKeyModalOpen(false); setPendingAction(null); }}
      />
      
      {isAwarenessMode && <AwarenessSpace apiKey={apiKey} onClose={handleAwarenessClose} />}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} apiKey={apiKey} setApiKey={setApiKey} onLogout={onLogout} username={username}/>
      <main className="flex-1 relative h-full flex flex-col w-full overflow-hidden">
        <div className="absolute top-4 right-4 z-[40] pointer-events-none transition-all duration-500 flex flex-col items-end space-y-2">
            {isSyncing ? (
                <span className="text-[10px] bg-white/80 backdrop-blur text-warm-500 px-3 py-1.5 rounded-full flex items-center shadow-sm border border-warm-100"><CloudCog size={12} className="animate-spin mr-1.5 text-macaron-blueDark"/> 云端同步中...</span>
            ) : saveError ? (
                <span className="text-[10px] bg-red-100/90 text-red-600 px-3 py-1.5 rounded-full flex items-center shadow-sm border border-red-200"><AlertTriangle size={12} className="mr-1.5"/> {saveError}</span>
            ) : (
                <span className="text-[10px] text-warm-300 opacity-0 md:opacity-50 flex items-center transition-opacity hover:opacity-100 bg-white/30 px-2 py-1 rounded-full"><CheckCircle2 size={12} className="mr-1"/> 数据已保护</span>
            )}
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default MainLayout;
