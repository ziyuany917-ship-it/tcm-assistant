import React, { useState } from 'react';
import { DailyLog, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Plus, BrainCircuit, Calendar, FileText, Loader2 } from 'lucide-react';

interface HealthJournalProps {
  logs: DailyLog[];
  setLogs: (logs: DailyLog[]) => void;
  profile: UserProfile;
  apiKey: string;
}

const HealthJournal: React.FC<HealthJournalProps> = ({ logs, setLogs, profile, apiKey }) => {
  const [newLogContent, setNewLogContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleRecord = () => {
    if (!newLogContent.trim()) return;

    const newLog: DailyLog = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('zh-CN'),
      content: newLogContent,
      type: 'general',
      timestamp: Date.now()
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    setNewLogContent('');
    // Simple toast could go here
  };

  const handleAnalyze = async () => {
    if (logs.length === 0) return;
    if (!apiKey) {
      alert("请设置 API Key");
      return;
    }

    setIsAnalyzing(true);
    try {
      const service = new GeminiService(apiKey);
      const result = await service.analyzeHealthLogs(logs, profile);
      setAnalysisResult(result);
    } catch (e) {
      setAnalysisResult("分析失败，请重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSummary = async (period: 'WEEKLY' | 'MONTHLY') => {
      if (logs.length === 0) return;
      if (!apiKey) {
        alert("请设置 API Key");
        return;
      }
      setIsAnalyzing(true);
      try {
        const service = new GeminiService(apiKey);
        const result = await service.generatePeriodSummary(logs, period, profile);
        setAnalysisResult(result);
      } catch (e) {
          setAnalysisResult("总结生成失败。");
      } finally {
          setIsAnalyzing(false);
      }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-full overflow-y-auto no-scrollbar pb-20">
      <h2 className="text-2xl font-serif font-bold text-tcm-800 mb-6 flex items-center">
        <BookHeartIcon className="mr-2" /> 健康医案
      </h2>

      {/* Input Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-tcm-100 mb-6">
        <textarea
          value={newLogContent}
          onChange={(e) => setNewLogContent(e.target.value)}
          placeholder="记录今日身体状况（如：今日吃了麻辣火锅，感觉胃胀，大便不畅...）"
          className="w-full p-3 border border-tcm-200 rounded-lg focus:ring-1 focus:ring-tcm-400 focus:outline-none text-sm min-h-[100px]"
        />
        <div className="flex justify-end mt-2 space-x-2">
            <button
                onClick={handleRecord}
                className="flex items-center px-4 py-2 bg-tcm-600 text-white rounded-lg hover:bg-tcm-700 transition-colors text-sm"
            >
                <Plus size={16} className="mr-1" /> 记录日常
            </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || logs.length === 0}
          className="flex flex-col items-center justify-center p-4 bg-white border border-tcm-200 rounded-xl hover:bg-tcm-50 transition-colors shadow-sm"
        >
          {isAnalyzing ? <Loader2 className="animate-spin text-tcm-600 mb-2" /> : <BrainCircuit className="text-tcm-600 mb-2" />}
          <span className="text-sm font-medium text-tcm-800">深度分析</span>
          <span className="text-xs text-tcm-400 mt-1">结合体质 + 近期记录</span>
        </button>

        <button
          onClick={() => handleSummary('WEEKLY')}
          disabled={isAnalyzing || logs.length === 0}
          className="flex flex-col items-center justify-center p-4 bg-white border border-tcm-200 rounded-xl hover:bg-tcm-50 transition-colors shadow-sm"
        >
           {isAnalyzing ? <Loader2 className="animate-spin text-tcm-600 mb-2" /> : <Calendar className="text-tcm-600 mb-2" />}
          <span className="text-sm font-medium text-tcm-800">周结报</span>
          <span className="text-xs text-tcm-400 mt-1">阶段性身体总结</span>
        </button>
      </div>

      {/* Analysis Result Display */}
      {analysisResult && (
        <div className="bg-tcm-50 border border-tcm-200 rounded-xl p-5 mb-8 shadow-sm animate-fade-in">
          <h3 className="font-serif font-bold text-tcm-800 mb-3 flex items-center">
            <FileText size={18} className="mr-2" /> 医嘱分析
          </h3>
          <div className="prose prose-sm prose-stone whitespace-pre-wrap text-gray-700 leading-relaxed">
            {analysisResult}
          </div>
          <button 
            onClick={() => setAnalysisResult(null)}
            className="mt-4 text-xs text-tcm-500 hover:underline"
          >
            收起分析
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-serif font-bold text-tcm-700 mb-2">历史记录</h3>
        {logs.length === 0 ? (
          <p className="text-center text-tcm-300 py-8 text-sm">暂无记录，请开始您的第一篇健康日记。</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white p-4 rounded-lg border border-tcm-100 shadow-sm flex flex-col md:flex-row md:items-start gap-3">
              <div className="md:w-24 shrink-0">
                <span className="inline-block bg-tcm-100 text-tcm-700 text-xs px-2 py-1 rounded font-medium">
                  {log.date}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 text-sm leading-relaxed">{log.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const BookHeartIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </svg>
);

export default HealthJournal;