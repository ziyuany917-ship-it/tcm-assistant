import React, { useState } from 'react';
import { DailyLog, DoneItem, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Image as ImageIcon, Sparkles, Loader2, PenTool, Calendar, TrendingUp } from 'lucide-react';

interface HealthMindLogProps {
  logs: DailyLog[];
  setLogs: (logs: DailyLog[]) => void;
  doneItems: DoneItem[];
  setDoneItems: (items: DoneItem[]) => void;
  profile: UserProfile;
  apiKey: string;
}

const HealthMindLog: React.FC<HealthMindLogProps> = ({ logs, setLogs, doneItems, setDoneItems, profile, apiKey }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisTitle, setAnalysisTitle] = useState('老己的信');
  
  const today = new Date().toLocaleDateString('zh-CN');
  const todaysLogs = logs.filter(l => l.date === today);
  
  const handleRapidLog = async (isAwareness: boolean) => {
    if (!input.trim()) return;
    
    const tempId = Date.now().toString();
    const currentInput = input;
    setInput('');

    const optimisticLog: DailyLog = {
      id: tempId,
      date: today,
      content: isAwareness ? `[觉察] ${currentInput}` : currentInput,
      type: isAwareness ? 'emotion' : 'general',
      timestamp: Date.now()
    };
    
    const newLogsList = [optimisticLog, ...logs];
    setLogs(newLogsList);

    if (!apiKey) {
        if (isAwareness) {
            alert("需要 Key 才能觉察哦~");
        }
        return;
    }

    setIsLoading(true);
    setAnalysisTitle(isAwareness ? '觉察反馈' : '记录分析');
    
    try {
      const service = new GeminiService(apiKey);
      
      if (isAwareness) {
        const response = await service.mindfulnessResponse(currentInput);
        setAnalysis(response);
      } else {
        const result = await service.parseLogInput(currentInput, new Date());
        
        if (result.items && result.items.length > 0) {
           setDoneItems([...result.items, ...doneItems]);
        }
        if (result.date !== today) {
            const updatedLogs = newLogsList.map(log => {
                if (log.id === tempId) {
                    return { ...log, date: result.date };
                }
                return log;
            });
            setLogs(updatedLogs);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
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
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-6 overflow-y-auto no-scrollbar bg-paper">
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
        <div className="bg-white p-6 rounded-[2rem] shadow-sticker border-2 border-white relative z-10">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="📝 吃了什么？做了什么？(AI会自动提取到“元气养成记”)...&#10;🧘 焦虑吗？告诉我..."
                className="w-full h-24 p-2 resize-none outline-none text-warm-800 placeholder-warm-300 bg-transparent text-lg font-rounded"
            />
            <div className="flex justify-between items-center mt-4 border-t border-warm-50 pt-3">
                <button className="text-warm-400 hover:text-macaron-peachDark p-2 bg-warm-50 rounded-full hover:bg-macaron-peach transition-colors"><ImageIcon size={20}/></button>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => handleRapidLog(true)}
                        className="text-macaron-mintDark bg-macaron-mint/50 hover:bg-macaron-mint px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                        🧘 觉察
                    </button>
                    <button 
                        onClick={() => handleRapidLog(false)}
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

      {/* AI Analysis / Mindfulness Feedback */}
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
          </div>
      )}
      
      {/* Log Stream */}
      <div className="space-y-4">
           <h3 className="text-warm-400 font-bold text-xs uppercase tracking-wider pl-2">今日流水</h3>
           {todaysLogs.length === 0 && <p className="text-warm-300 text-sm italic pl-2">还没有碎碎念...</p>}
           {todaysLogs.map(log => (
               <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-transparent hover:border-macaron-blue flex items-start space-x-3 transition-all">
                   <span className="text-xs font-bold text-macaron-blueDark mt-1 bg-macaron-blue/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                       {new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                   </span>
                   <p className="text-warm-800 text-sm leading-relaxed">{log.content}</p>
               </div>
           ))}
      </div>
    </div>
  );
};

export default HealthMindLog;