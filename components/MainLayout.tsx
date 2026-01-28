
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import HealthMindLog from './HealthMindLog';
import GrowthTracks from './GrowthTracks';
import UserProfileForm from './UserProfileForm';
import ConsultationChat from './ConsultationChat';
import AwarenessSpace from './AwarenessSpace';
import { View, UserProfile, DailyLog, DoneItem, ChatMessage, Habit } from '../types';
import { supabase } from '../services/supabaseClient';
import { GeminiService } from '../services/geminiService';
import { Loader2 } from 'lucide-react';

interface MainLayoutProps {
  username: string;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ username, onLogout }) => {
  const [currentView, setCurrentView] = useState<View>(View.CONSULTATION);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // --- State ---
  const [apiKey, setApiKey] = useState('');
  const [profile, setProfile] = useState<UserProfile>({ name: username, age: '', gender: '', constitution: '', history: '', allergies: '' });
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [doneItems, setDoneItems] = useState<DoneItem[]>([]);
  const [consultationMessages, setConsultationMessages] = useState<ChatMessage[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  const [isAwarenessMode, setIsAwarenessMode] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      setIsInitializing(true);
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('username', username)
          .single();

        if (data) {
          if (data.profile) setProfile(data.profile);
          if (data.daily_logs) setLogs(data.daily_logs);
          if (data.done_items) setDoneItems(data.done_items);
          if (data.consultation_history) setConsultationMessages(data.consultation_history);
          if (data.habits && Array.isArray(data.habits) && data.habits.length > 0) {
              setHabits(data.habits);
          } else {
              setHabits([
                { id: '1', name: '早睡 (23:00)', history: {} },
                { id: '2', name: '阅读 30分', history: {} },
                { id: '3', name: '八段锦/运动', history: {} }
              ]);
          }
          if (data.settings?.apiKey) setApiKey(data.settings.apiKey);
          checkAndCompressLogs(data.daily_logs || [], data.profile || {}, data.settings?.apiKey);
        } else {
             setHabits([
                { id: '1', name: '早睡 (23:00)', history: {} },
                { id: '2', name: '阅读 30分', history: {} },
                { id: '3', name: '八段锦/运动', history: {} }
              ]);
        }
      } catch (e) {
        console.error("Load failed", e);
      } finally {
        setIsInitializing(false);
      }
    };
    loadUserData();
  }, [username]);

  const checkAndCompressLogs = async (currentLogs: DailyLog[], currentProfile: UserProfile, key: string) => {
      if (!key) return; 
      const unsummarizedLogs = currentLogs.filter(l => !l.content.startsWith('【周结报】'));
      if (unsummarizedLogs.length >= 7) {
          const service = new GeminiService(key);
          const result = await service.compressLogsAndCheckConstitution(unsummarizedLogs, currentProfile);
          const summaryLog: DailyLog = {
              id: 'summary-' + Date.now(),
              date: new Date().toLocaleDateString('zh-CN'),
              content: `【周结报】${result.summary}`,
              type: 'general',
              timestamp: Date.now()
          };
          const keptLogs = currentLogs.filter(l => l.content.startsWith('【周结报】'));
          const newLogList = [summaryLog, ...keptLogs]; 
          setLogs(newLogList);
          if (result.newConstitution) {
              setProfile(prev => ({ ...prev, constitution: result.newConstitution! }));
          }
          await saveDataToCloud({ daily_logs: newLogList });
      }
  };

  const saveDataToCloud = async (overrideData?: any) => {
      setIsSyncing(true);
      const updatePayload = overrideData || {
          profile,
          daily_logs: logs,
          done_items: doneItems,
          consultation_history: consultationMessages,
          habits: habits,
          settings: { apiKey },
          last_updated: new Date().toISOString()
      };
      try {
          await supabase.from('app_users').update(updatePayload).eq('username', username);
      } catch (e) {
          console.error("Save failed", e);
      } finally {
          setIsSyncing(false);
      }
  };

  useEffect(() => {
     if (isInitializing) return;
     const timer = setTimeout(() => saveDataToCloud(), 2000);
     return () => clearTimeout(timer);
  }, [profile, logs, doneItems, consultationMessages, apiKey, habits]);

  const handleAwarenessClose = (summary: string) => {
      // Save Awareness session as a specific 'meditation' type log
      const newLog: DailyLog = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString('zh-CN'),
          content: summary,
          type: 'meditation', // CHANGED: specific type for awareness
          timestamp: Date.now()
      };
      setLogs([newLog, ...logs]);
      setIsAwarenessMode(false);
  };

  const renderContent = () => {
    if (isInitializing) return <div className="flex h-full items-center justify-center text-warm-500"><Loader2 className="animate-spin mr-2"/>正在从云端提取记忆...</div>;

    switch (currentView) {
      case View.CONSULTATION:
        // Pass logs and setLogs to allow saving diagnosis results
        return <ConsultationChat profile={profile} apiKey={apiKey} messages={consultationMessages} setMessages={setConsultationMessages} logs={logs} setLogs={setLogs} />;
      case View.MIND_BODY_DASHBOARD:
        return <HealthMindLog logs={logs} setLogs={setLogs} doneItems={doneItems} setDoneItems={setDoneItems} profile={profile} apiKey={apiKey} onEnterAwareness={() => setIsAwarenessMode(true)}/>;
      case View.GROWTH:
        return <GrowthTracks apiKey={apiKey} doneItems={doneItems} setDoneItems={setDoneItems} habits={habits} setHabits={setHabits} profile={profile} setProfile={setProfile} logs={logs}/>;
      case View.PROFILE:
        return <UserProfileForm profile={profile} setProfile={setProfile} apiKey={apiKey} />;
      default:
        return <ConsultationChat profile={profile} apiKey={apiKey} messages={consultationMessages} setMessages={setConsultationMessages} logs={logs} setLogs={setLogs} />;
    }
  };

  return (
    <div className="flex h-screen bg-warm-50 overflow-hidden font-sans text-warm-900 selection:bg-warm-200 relative">
      {isAwarenessMode && <AwarenessSpace apiKey={apiKey} onClose={handleAwarenessClose} />}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} apiKey={apiKey} setApiKey={setApiKey} onLogout={onLogout} username={username}/>
      <main className="flex-1 relative h-full flex flex-col w-full overflow-hidden">
        <div className="absolute top-4 right-4 z-[40] pointer-events-none">
            {isSyncing ? <span className="text-[10px] bg-white/50 backdrop-blur text-warm-400 px-2 py-1 rounded-full flex items-center shadow-sm"><Loader2 size={10} className="animate-spin mr-1"/> 云同步中...</span> : <span className="text-[10px] text-warm-300 opacity-50">☁️ 已同步</span>}
        </div>
        {renderContent()}
      </main>
    </div>
  );
};

export default MainLayout;
