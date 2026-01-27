import React, { useState } from 'react';
import { DailyLog, DoneItem, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Image as ImageIcon, Sparkles, Loader2, PenTool, Calendar, TrendingUp, Sun, Moon, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HealthMindLogProps {
  logs: DailyLog[];
  setLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  doneItems: DoneItem[];
  setDoneItems: (items: DoneItem[]) => void;
  profile: UserProfile;
  apiKey: string;
  onEnterAwareness: () => void;
}

const HealthMindLog: React.FC<HealthMindLogProps> = ({ logs, setLogs, doneItems, setDoneItems, profile, apiKey, onEnterAwareness }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // States for Daily Insight / Reports
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState('');
  
  // Toast state
  const [toastMsg, setToastMsg] = useState('');

  // Delete Modal State
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  
  const today = new Date().toLocaleDateString('zh-CN');
  const todaysLogs = logs.filter(l => l.date === today).sort((a, b) => b.timestamp - a.timestamp);
  
  const showToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(''), 3000);
  };

  const handleRecord = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // 1. Save Log Immediately (Optimistic)
    const tempId = Date.now().toString();
    const optimisticLog: DailyLog = {
      id: tempId,
      date: today,
      content: currentInput,
      type: 'general',
      timestamp: Date.now()
    };
    
    // Functional update to safely add new log
    setLogs(prev => [optimisticLog, ...prev]);

    if (!apiKey) {
        setIsLoading(false);
        showToast("已记录 (离线)");
        return;
    }

    try {
      const service = new GeminiService(apiKey);
      // 2. Classify & Parse
      const result = await service.parseLogInput(currentInput, new Date());

      // If Tasks detected
      if (result.items && result.items.length > 0) {
           setDoneItems([...result.items, ...doneItems]);
           showToast(`已自动提取 ${result.items.length} 个成就 ✨`);
      } else {
           showToast("已记录流水");
      }

      // Update date if AI inferred different date
      if (result.date !== today) {
            setLogs(prev => prev.map(log => {
                if (log.id === tempId) {
                    return { ...log, date: result.date };
                }
                return log;
            }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Replace window.confirm with modal state
  const requestDelete = (id: string) => {
      setLogToDelete(id);
  };

  const confirmDelete = () => {
      if (logToDelete) {
          setLogs(prevLogs => prevLogs.filter(l => l.id !== logToDelete));
          showToast("🗑️ 记录已删除");
          setLogToDelete(null);
      }
  };

  const handleDailyInsight = async () => {
    if (!apiKey) return alert("Key 还没设置呢~");
    setIsLoading(true);
    setAnalysisTitle('今日复盘');
    try {
      const todaysItems = doneItems.filter(i => i.date === today);
      const service = new GeminiService(apiKey);
      const insight = await service.generateDailyInsight(todaysLogs, todaysItems, profile);
      setAnalysis(insight);
    } catch(e) { console.error(e) } 
    finally { setIsLoading(false); }
  };

  const handleGrowthReport = async (period: 'WEEKLY' | 'MONTHLY') => {
      if (!apiKey) return alert("Key 还没设置呢~");
      setIsLoading(true);
      setAnalysisTitle(period === 'WEEKLY' ? '周度成长报告' : '月度身心总结');
      try {
          const service = new GeminiService(apiKey);
          const report = await service.generatePeriodSummary(logs, period, profile);
          setAnalysis(report);
      } catch(e) { console.error(e) }
      finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-6 overflow-y-auto no-scrollbar bg-paper relative">
      {/* Toast Notification */}
      <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] bg-warm-800 text-white px-6 py-2 rounded-full shadow-lg transition-all duration-300 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center space-x-2 font-bold text-sm">
              <CheckCircle2 size={16}/> <span>{toastMsg}</span>
          </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {logToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-cinematic" onClick={() => setLogToDelete(null)}>
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl border-4 border-white max-w-sm w-full relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-2 bg-red-400/20"></div>
                <h3 className="text-xl font-rounded font-bold text-warm-800 mb-2 flex items-center">
                    <AlertTriangle className="text-red-400 mr-2" size={20}/> 确认删除
                </h3>
                <p className="text-warm-600 mb-6 text-sm leading-relaxed">
                    这条记录将化为云烟，确定要丢弃它吗？
                </p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setLogToDelete(null)}
                        className="px-5 py-2.5 text-warm-500 hover:bg-warm-50 rounded-xl text-sm font-bold transition-colors"
                    >
                        再想想
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-md transition-transform active:scale-95"
                    >
                        确认删除
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
           <h2 className="text-3xl font-rounded font-bold text-warm-800">时光碎碎念 📝</h2>
           <p className="text-warm-500 text-sm mt-1 ml-10">记录当下 · {today}</p>
        </div>
        <button 
            onClick={handleDailyInsight}
            disabled={isLoading}
            className="bg-macaron-yellow hover:bg-macaron-yellowDark hover:text-white text-macaron-yellowDark px-5 py-2 rounded-2xl text-sm font-bold transition-all shadow-sticker hover:scale-105 flex items-center"
        >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={16}/> : <Sparkles className="mr-2" size={16}/>}
            今日复盘
        </button>
      </header>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-sticker border-2 border-white relative z-10 transition-all">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="📝 吃了什么？做了什么？(AI会自动提取到“元气养成记”)..."
                className="w-full h-24 p-2 resize-none outline-none text-warm-800 placeholder-warm-300 bg-transparent text-lg font-rounded"
            />
            <div className="flex justify-between items-center mt-4 border-t border-warm-50 pt-3">
                <button className="text-warm-400 hover:text-macaron-peachDark p-2 bg-warm-50 rounded-full hover:bg-macaron-peach transition-colors"><ImageIcon size={20}/></button>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => {
                            if (!apiKey) { alert("请先设置 Key"); return; }
                            onEnterAwareness();
                        }}
                        className="text-macaron-mintDark bg-macaron-mint/50 hover:bg-macaron-mint px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center shadow-sm border border-transparent hover:border-macaron-mintDark"
                    >
                        <Sun size={16} className="mr-1"/> 深度觉察 (专注)
                    </button>
                    <button 
                        onClick={handleRecord}
                        disabled={isLoading}
                        className="bg-macaron-peachDark hover:bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center hover:scale-105"
                    >
                        <PenTool size={16} className="mr-2"/> 记录
                    </button>
                </div>
            </div>
        </div>
        
        {/* Growth Report Buttons */}
        <div className="flex justify-end space-x-3 px-2">
            <button 
                onClick={() => handleGrowthReport('WEEKLY')}
                className="flex items-center text-xs text-warm-500 hover:text-white hover:bg-macaron-blueDark bg-macaron-blue/30 px-3 py-1.5 rounded-lg transition-colors font-bold"
                disabled={isLoading}
            >
                <TrendingUp size={14} className="mr-1.5"/> 周报 (成长)
            </button>
            <button 
                onClick={() => handleGrowthReport('MONTHLY')}
                className="flex items-center text-xs text-warm-500 hover:text-white hover:bg-macaron-peachDark bg-macaron-peach/50 px-3 py-1.5 rounded-lg transition-colors font-bold"
                disabled={isLoading}
            >
                <Calendar size={14} className="mr-1.5"/> 月报 (身心)
            </button>
        </div>
      </div>

      {/* AI Analysis (Reports/Insight) */}
      {analysis && (
          <div className="bg-gradient-to-br from-white to-macaron-cream p-6 rounded-[2rem] border-2 border-white shadow-sticker animate-cinematic relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20 text-macaron-yellowDark"><Sparkles size={80}/></div>
              <h3 className="text-warm-800 font-rounded font-bold mb-4 flex items-center text-lg">
                  <span className="bg-macaron-yellow p-1.5 rounded-full mr-2 text-macaron-yellowDark"><Sparkles size={16}/></span> 
                  {analysisTitle}
              </h3>
              <div className="prose prose-stone text-warm-700 leading-relaxed font-rounded whitespace-pre-wrap">
                  {analysis}
              </div>
              <button 
                onClick={() => setAnalysis(null)}
                className="mt-4 text-xs text-warm-400 hover:text-warm-600"
              >
                  收起
              </button>
          </div>
      )}
      
      {/* Log Stream */}
      <div className="space-y-4 pb-20">
           <h3 className="text-warm-400 font-bold text-xs uppercase tracking-wider pl-2 flex items-center justify-between">
               <span>今日流水</span>
               <span className="text-[10px] bg-warm-100 px-2 py-0.5 rounded-full">{todaysLogs.length} 条</span>
           </h3>
           {todaysLogs.length === 0 && <p className="text-warm-300 text-sm italic pl-2">还没有碎碎念...</p>}
           
           {todaysLogs.map(log => (
               <div key={log.id} className="group bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-macaron-blue flex items-start space-x-3 transition-all relative animate-cinematic">
                   <span className="text-xs font-bold text-macaron-blueDark mt-1 bg-macaron-blue/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                       {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                   </span>
                   <div className="flex-1 pr-6">
                       <p className="text-warm-800 text-sm leading-relaxed whitespace-pre-wrap">{log.content}</p>
                   </div>
                   
                   {/* Delete Button - Triggers Custom Modal */}
                   <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            requestDelete(log.id);
                        }}
                        className="z-20 absolute top-1 right-1 p-2 text-warm-300 hover:text-red-500 hover:bg-red-50/80 rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100"
                        title="删除这条记录"
                   >
                       <Trash2 size={16} />
                   </button>
               </div>
           ))}
      </div>
    </div>
  );
};

export default HealthMindLog;