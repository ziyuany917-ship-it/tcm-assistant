
import React, { useState } from 'react';
import { Habit, DoneItem, UserProfile, DailyLog } from '../types';
import { GeminiService } from '../services/geminiService';
import { Sprout, X, Plus, Check, PieChart, Target, History, CalendarRange, Trash2, Loader2, Sparkles, Edit3 } from 'lucide-react';

interface GrowthTracksProps {
  apiKey: string;
  doneItems: DoneItem[];
  setDoneItems: (items: DoneItem[]) => void;
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  logs: DailyLog[];
  onRequireAuth: (callback: () => void) => void;
}

const SEGMENT_COLORS = ["#F9A825", "#FF7043", "#26A69A", "#42A5F5", "#AB47BC", "#EC407A", "#8D6E63", "#78909C"];

const GrowthTracks: React.FC<GrowthTracksProps> = ({ apiKey, doneItems, setDoneItems, habits, setHabits, profile, setProfile, logs, onRequireAuth }) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemHours, setNewItemHours] = useState('');
  const [editingItem, setEditingItem] = useState<DoneItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemHours, setEditItemHours] = useState('');
  const [isGoalEditing, setIsGoalEditing] = useState(false);
  
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [cycleAnalysis, setCycleAnalysis] = useState<string | null>(null);
  const [isAnalyzingCycle, setIsAnalyzingCycle] = useState(false);

  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editHabitName, setEditHabitName] = useState('');
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const goals = profile.goals || '';
  const todayDateStr = new Date().toLocaleDateString('zh-CN');
  
  const todaysItems = doneItems.filter(i => i.date === todayDateStr);
  const totalHoursToday = todaysItems.reduce((acc, i) => acc + i.hours, 0);

  const handleGoalsChange = (newGoals: string) => setProfile({ ...profile, goals: newGoals });

  const handleAddItem = () => {
    if (newItemName && newItemHours) {
        const item: DoneItem = {
            id: Date.now().toString(),
            date: todayDateStr,
            activity: newItemName,
            hours: parseFloat(newItemHours) || 0,
            completed: true
        };
        setDoneItems([item, ...doneItems]);
        setNewItemName('');
        setNewItemHours('');
        setIsAddingItem(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setDoneItems(doneItems.filter(i => i.id !== id));
    if (editingItem?.id === id) setEditingItem(null);
  };

  const handleUpdateItem = () => {
      if (!editingItem || !editItemName) return;
      const updatedItems = doneItems.map(item => {
          if (item.id === editingItem.id) {
              return { ...item, activity: editItemName, hours: parseFloat(editItemHours) || 0 };
          }
          return item;
      });
      setDoneItems(updatedItems);
      setEditingItem(null);
  };

  const handleAddHabit = () => {
      if (!newHabitName.trim()) return;
      const newHabit: Habit = { id: Date.now().toString(), name: newHabitName.trim(), history: {} };
      setHabits([...habits, newHabit]);
      setNewHabitName('');
      setIsAddingHabit(false);
  };

  const handleDeleteHabit = (id: string) => { setHabits(habits.filter(h => h.id !== id)); };
  const handleStartEditHabit = (habit: Habit) => { setEditingHabitId(habit.id); setEditHabitName(habit.name); };
  const handleSaveHabitName = () => {
      if (!editingHabitId || !editHabitName.trim()) return;
      setHabits(habits.map(h => h.id === editingHabitId ? { ...h, name: editHabitName.trim() } : h));
      setEditingHabitId(null);
  };

  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const currentDayOfYear = getDayOfYear();
  const currentCycleIndex = Math.ceil(currentDayOfYear / 10);

  const toggleDay = (habitId: string, dayIndex: number, cycleId: number) => {
    const startDayOfCycle = (cycleId - 1) * 10;
    const actualDayOfYear = startDayOfCycle + dayIndex + 1;
    if (actualDayOfYear > currentDayOfYear) return;

    const updated = habits.map(h => {
        if (h.id === habitId) {
            const currentHistory = h.history[cycleId] || Array(10).fill(false);
            const newHistory = [...currentHistory];
            newHistory[dayIndex] = !newHistory[dayIndex];
            return { ...h, history: { ...h.history, [cycleId]: newHistory } };
        }
        return h;
    });
    setHabits(updated);
  };

  const getCycleDateRange = (cycleId: number) => {
      const year = new Date().getFullYear();
      const startDate = new Date(year, 0, 1 + (cycleId - 1) * 10);
      const endDate = new Date(year, 0, 1 + (cycleId - 1) * 10 + 9);
      const format = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
      return `${format(startDate)} - ${format(endDate)}`;
  };

  const getHabitColor = (habit: Habit, cycleId: number) => {
      const history = habit.history[cycleId];
      if (!history) return 'bg-warm-100'; 
      const count = history.filter(Boolean).length;
      const percentage = (count / 10) * 100;
      if (percentage === 0 && cycleId >= currentCycleIndex) return 'bg-warm-100';
      if (percentage < 40) return 'bg-red-400';
      if (percentage < 60) return 'bg-orange-400';
      if (percentage < 80) return 'bg-macaron-yellowDark';
      return 'bg-macaron-mintDark';
  };

  // Intercepted Action
  const handleCycleClick = (cycleId: number) => {
      if (cycleId > currentCycleIndex) return;
      
      onRequireAuth(async () => {
          setSelectedCycle(cycleId);
          setCycleAnalysis(null);
          setIsAnalyzingCycle(true);
          try {
              const service = new GeminiService(apiKey);
              const analysis = await service.generateCycleAnalysis(cycleId, habits, logs, profile);
              setCycleAnalysis(analysis);
          } catch (e) {
              setCycleAnalysis("回忆正在模糊...");
          } finally {
              setIsAnalyzingCycle(false);
          }
      });
  };

  const calculateDonutSegments = () => {
    let accumulatedCircumference = 0;
    const radius = 62;
    const totalCircumference = 2 * Math.PI * radius; 
    const displayTotal = totalHoursToday > 0 ? totalHoursToday : 1; 

    return todaysItems.map((item, index) => {
        const percentage = totalHoursToday > 0 ? (item.hours / displayTotal) : 0;
        const strokeLength = percentage * totalCircumference;
        const offset = accumulatedCircumference;
        accumulatedCircumference += strokeLength;
        return { ...item, color: SEGMENT_COLORS[index % SEGMENT_COLORS.length], strokeDasharray: `${strokeLength} ${totalCircumference}`, strokeDashoffset: -offset };
    });
  };

  const donutSegments = calculateDonutSegments();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar space-y-8 bg-paper relative">
      <header className="flex items-end justify-between">
        <div>
            <h2 className="text-3xl font-rounded font-bold text-warm-800 flex items-center"><Sprout className="mr-3 text-macaron-yellowDark" /> 元气养成记 ✨</h2>
            <p className="text-warm-500 text-sm mt-1 ml-10">坚持的意义由你定义</p>
        </div>
      </header>

      <section className="bg-white p-6 rounded-[2rem] shadow-sticker border-2 border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-macaron-peach/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-xl font-rounded font-bold text-warm-700 flex items-center"><Target className="mr-2 text-macaron-peachDark"/> 年度愿望清单</h3>
              <button onClick={() => setIsGoalEditing(!isGoalEditing)} className="text-warm-400 hover:text-warm-600 text-sm underline decoration-dashed">{isGoalEditing ? '保存' : '修改'}</button>
          </div>
          {isGoalEditing ? (
              <textarea value={goals} onChange={e => handleGoalsChange(e.target.value)} className="w-full bg-macaron-cream border border-warm-200 rounded-2xl p-4 text-warm-800 outline-none focus:ring-2 focus:ring-macaron-yellow transition-all" rows={3}/>
          ) : (
              <div className="bg-macaron-cream/50 p-4 rounded-2xl border border-warm-100 text-warm-800 min-h-[60px] flex items-center">{goals ? goals : <span className="text-warm-300 italic">写下你的年度愿景...</span>}</div>
          )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white rounded-[2rem] shadow-sticker border-2 border-white p-6 flex flex-col transition-all duration-500 min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <div className="bg-macaron-mint p-2 rounded-full text-macaron-mintDark shadow-sm"><Check size={18}/></div>
                    <h3 className="text-warm-800 font-rounded font-bold text-lg">今日成就</h3>
                    <span className="text-xs text-white bg-macaron-mintDark/40 px-2 py-0.5 rounded-full font-bold">{todaysItems.length}</span>
                </div>
                <button onClick={() => setIsAddingItem(!isAddingItem)} className={`p-2 rounded-full transition-all ${isAddingItem ? 'bg-red-50 text-red-400 rotate-45 shadow-inner' : 'bg-warm-50 text-warm-400 hover:bg-macaron-mint hover:text-macaron-mintDark shadow-sm'}`}><Plus size={18}/></button>
            </div>
            {isAddingItem && (
                <div className="mb-4 p-3 bg-warm-50 rounded-2xl animate-cinematic flex space-x-2 items-center border border-warm-100 shadow-inner">
                    <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="想做什么？" className="flex-1 bg-white border-none rounded-xl px-3 py-2 text-sm outline-none shadow-sm font-medium"/>
                    <input type="number" step="0.5" value={newItemHours} onChange={e => setNewItemHours(e.target.value)} placeholder="h" className="w-14 bg-white border-none rounded-xl px-2 py-2 text-sm outline-none shadow-sm text-center font-bold"/>
                    <button onClick={handleAddItem} className="bg-macaron-mintDark text-white p-2 rounded-xl shadow-md hover:scale-105 active:scale-95"><Check size={18}/></button>
                </div>
            )}
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-[250px] p-1">
                {todaysItems.map((item, idx) => (
                    <div key={item.id} onClick={() => { setEditingItem(item); setEditItemName(item.activity); setEditItemHours(item.hours.toString()); }} className="group flex justify-between items-center py-3 px-4 bg-warm-50/40 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-macaron-mint/50 shadow-sm cursor-pointer">
                        <div className="flex items-center space-x-3 truncate">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}></div>
                            <span className="text-sm font-bold text-warm-700 truncate">{item.activity}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                             <span className="text-xs text-warm-400 font-mono bg-white px-2 py-1 rounded-md shadow-sm border border-warm-50">{item.hours}h</span>
                             <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="text-warm-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sticker border-2 border-white p-6 h-full flex flex-col items-center justify-start min-h-[300px]">
            <div className="w-full flex items-center space-x-2 mb-4"><div className="bg-macaron-yellow p-2 rounded-full text-macaron-yellowDark shadow-sm"><PieChart size={18}/></div><h3 className="text-warm-800 font-rounded font-bold text-lg">时间甜甜圈</h3></div>
            <div className="flex flex-col md:flex-row items-center justify-around w-full h-full gap-6">
                <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="62" fill="none" stroke="#fef9e7" strokeWidth="12" />
                        {donutSegments.map((seg) => ( <circle key={seg.id} cx="80" cy="80" r="62" fill="none" stroke={seg.color} strokeWidth="12" strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out"/>))}
                    </svg>
                    <div className="absolute flex flex-col items-center pointer-events-none"><span className="text-3xl font-bold text-warm-700">{totalHoursToday.toFixed(1)}</span><span className="text-[10px] text-warm-400 font-bold uppercase">专注(h)</span></div>
                </div>
                <div className="flex-1 w-full max-h-[200px] overflow-y-auto no-scrollbar space-y-2 px-2">
                     {donutSegments.map((seg) => (
                         <div key={seg.id} onClick={() => { setEditingItem(seg); setEditItemName(seg.activity); setEditItemHours(seg.hours.toString()); }} className="flex items-center justify-between text-xs p-2 hover:bg-warm-50 rounded-lg cursor-pointer transition-colors">
                            <div className="flex items-center space-x-2 truncate"><div className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: seg.color }}></div><span className="font-bold text-warm-600 truncate">{seg.activity}</span></div><span className="font-mono text-warm-400">{seg.hours}h</span>
                         </div>
                     ))}
                </div>
            </div>
        </div>
      </div>

      {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-cinematic" onClick={() => setEditingItem(null)}>
              <div className="bg-white rounded-[2rem] p-6 shadow-2xl border-4 border-white max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-warm-800 mb-4 flex items-center"><Edit3 className="mr-2 text-macaron-mintDark" size={20}/> 修改成就</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-warm-400 uppercase ml-1">任务名称</label><input value={editItemName} onChange={e => setEditItemName(e.target.value)} className="w-full bg-warm-50 rounded-xl px-4 py-3 mt-1 font-bold text-warm-800 outline-none focus:ring-2 focus:ring-macaron-mint"/></div>
                      <div><label className="text-xs font-bold text-warm-400 uppercase ml-1">时长 (小时)</label><input type="number" step="0.5" value={editItemHours} onChange={e => setEditItemHours(e.target.value)} className="w-full bg-warm-50 rounded-xl px-4 py-3 mt-1 font-bold text-warm-800 outline-none focus:ring-2 focus:ring-macaron-mint"/></div>
                      <div className="flex justify-end space-x-2 pt-2"><button onClick={() => setEditingItem(null)} className="px-4 py-2 text-warm-500 hover:bg-warm-50 rounded-xl text-sm font-bold">取消</button><button onClick={handleUpdateItem} className="px-6 py-2 bg-macaron-mintDark text-white rounded-xl text-sm font-bold shadow-md">确认修改</button></div>
                  </div>
              </div>
          </div>
      )}

      <section className="bg-white p-6 rounded-[2.5rem] shadow-sticker border-2 border-white">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
             <div className="flex items-center space-x-3"><div className="bg-macaron-blue text-macaron-blueDark px-4 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center">本期修行</div><h3 className="text-2xl font-rounded font-bold text-warm-800">第 {currentCycleIndex} 周期</h3></div>
             <div className="flex items-center text-sm font-bold text-warm-500 bg-warm-50 px-4 py-2 rounded-full border border-warm-100"><CalendarRange size={16} className="mr-2 text-warm-400"/>{getCycleDateRange(currentCycleIndex)}</div>
         </div>
         <div className="space-y-8">
             {habits.map(habit => (
                 <div key={habit.id} className="bg-warm-50/30 p-4 rounded-[2rem] border border-warm-50 relative group">
                     <div className="flex justify-between mb-4 px-2 items-center">
                         {editingHabitId === habit.id ? (
                             <div className="flex items-center space-x-2"><input autoFocus value={editHabitName} onChange={e => setEditHabitName(e.target.value)} className="bg-white border-2 border-macaron-blue/30 rounded-lg px-2 py-1 text-sm font-bold text-warm-800 outline-none" onBlur={handleSaveHabitName} onKeyDown={e => e.key === 'Enter' && handleSaveHabitName()}/><button onClick={handleSaveHabitName} className="text-macaron-mintDark"><Check size={16}/></button></div>
                         ) : (
                             <span className="font-bold text-warm-700 flex items-center group/name"><div className={`w-2 h-2 rounded-full mr-2 ${getHabitColor(habit, currentCycleIndex)}`}></div><span className="hover:text-macaron-blueDark transition-colors cursor-pointer" onClick={() => handleStartEditHabit(habit)}>{habit.name}</span><button onClick={() => handleStartEditHabit(habit)} className="ml-2 opacity-0 group-hover/name:opacity-100 transition-opacity text-warm-300 hover:text-macaron-blueDark"><Edit3 size={12}/></button></span>
                         )}
                         <div className="flex items-center space-x-3"><span className="text-xs text-warm-400 font-mono bg-white px-3 py-1 rounded-full shadow-sm">{habit.history[currentCycleIndex]?.filter(Boolean).length || 0} / 10</span><button onClick={() => handleDeleteHabit(habit.id)} className="text-warm-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button></div>
                     </div>
                     <div className="grid grid-cols-10 gap-2">
                         {Array.from({length: 10}, (_, i) => i).map(dayIdx => {
                             const isDone = habit.history[currentCycleIndex]?.[dayIdx] || false;
                             const actualDayOfYear = (currentCycleIndex - 1) * 10 + dayIdx + 1;
                             const isFuture = actualDayOfYear > currentDayOfYear;
                             return ( <button key={dayIdx} onClick={() => toggleDay(habit.id, dayIdx, currentCycleIndex)} disabled={isFuture} className={`aspect-square rounded-xl transition-all flex items-center justify-center text-white ${isFuture ? 'opacity-20 cursor-not-allowed bg-warm-100' : 'cursor-pointer active:scale-90'} ${isDone ? 'bg-macaron-yellowDark' : 'bg-white border-2 border-warm-50 text-warm-100'}`}>{isDone ? <Check size={14} strokeWidth={4} /> : <div className="w-1 h-1 bg-current rounded-full"></div>}</button> )
                         })}
                     </div>
                 </div>
             ))}
             {isAddingHabit ? (
                 <div className="bg-white/50 p-4 rounded-[2rem] border-2 border-dashed border-warm-200 animate-cinematic flex space-x-2"><input autoFocus value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="想养成什么习惯？" className="flex-1 bg-white border border-warm-100 rounded-xl px-4 py-2 text-sm outline-none font-bold" onKeyDown={e => e.key === 'Enter' && handleAddHabit()}/><button onClick={handleAddHabit} className="bg-macaron-blueDark text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md">添加</button><button onClick={() => setIsAddingHabit(false)} className="text-warm-400 p-2"><X size={20}/></button></div>
             ) : (
                <button onClick={() => setIsAddingHabit(true)} className="w-full py-4 border-2 border-dashed border-warm-200 rounded-[2rem] text-warm-300 hover:text-macaron-blueDark hover:border-macaron-blue hover:bg-macaron-blue/5 transition-all font-bold flex items-center justify-center space-x-2"><Plus size={20}/><span>添加新修行任务</span></button>
             )}
         </div>
      </section>

      <section className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-[3rem] shadow-sticker border-2 border-white pb-12">
          <div className="flex items-center justify-between mb-8"><div className="flex items-center space-x-3"><div className="bg-macaron-peach p-2.5 rounded-full text-macaron-peachDark shadow-sm"><History size={20}/></div><h3 className="text-2xl font-rounded font-bold text-warm-800">身心大盘 (36周期)</h3></div></div>
          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-4">
              {Array.from({length: 36}, (_, i) => i + 1).map(cycleId => (
                  <button key={cycleId} onClick={() => handleCycleClick(cycleId)} className={`relative aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center group ${cycleId === currentCycleIndex ? 'border-macaron-peachDark shadow-lg scale-110 z-10 bg-white' : 'border-white bg-white/40 hover:bg-white'} ${cycleId > currentCycleIndex ? 'opacity-40 grayscale pointer-events-none' : 'hover:shadow-md hover:-translate-y-1'}`}>
                      <span className={`text-[10px] font-bold mb-1 ${cycleId === currentCycleIndex ? 'text-macaron-peachDark' : 'text-warm-400'}`}>{cycleId}</span>
                      <div className="absolute bottom-1.5 right-1.5 flex flex-wrap max-w-[14px] justify-end gap-0.5">{habits.map(h => ( <div key={h.id} className={`w-1.5 h-1.5 rounded-full border-[0.5px] border-white shadow-[0_0.5px_1px_rgba(0,0,0,0.1)] ${getHabitColor(h, cycleId)}`}/> ))}</div>
                      {cycleId === currentCycleIndex && ( <div className="absolute inset-0 border-2 border-macaron-peachDark rounded-2xl animate-pulse pointer-events-none opacity-50"></div> )}
                  </button>
              ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-6 justify-center bg-warm-50/50 p-4 rounded-3xl border border-warm-100">
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div><span className="text-xs font-bold text-warm-500">虚 (0-40%)</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm"></div><span className="text-xs font-bold text-warm-500">潜 (40-60%)</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-macaron-yellowDark shadow-sm"></div><span className="text-xs font-bold text-warm-500">升 (60-80%)</span></div>
              <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full bg-macaron-mintDark shadow-sm"></div><span className="text-xs font-bold text-warm-500">盈 (80-100%)</span></div>
          </div>
      </section>

      {selectedCycle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-cinematic" onClick={() => setSelectedCycle(null)}>
              <div className="bg-paper rounded-[3rem] p-8 shadow-2xl border-8 border-white max-w-lg w-full relative overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 w-full h-4 bg-macaron-peachDark/10"></div>
                  <div className="flex justify-between items-start mb-8">
                      <div><h3 className="text-2xl font-rounded font-bold text-warm-800 flex items-center"><History className="mr-3 text-macaron-peachDark" /> 第 {selectedCycle} 周期回顾</h3><div className="mt-2 inline-flex items-center text-xs font-bold text-warm-400 bg-white px-3 py-1.5 rounded-full border border-warm-100">{getCycleDateRange(selectedCycle)}</div></div>
                      <button onClick={() => setSelectedCycle(null)} className="p-3 bg-white rounded-full text-warm-300 hover:text-red-400 shadow-sm transition-all hover:rotate-90"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-6 no-scrollbar">
                      {isAnalyzingCycle ? (
                          <div className="flex flex-col items-center justify-center py-24 space-y-4"><Loader2 className="animate-spin text-macaron-peachDark" size={48}/><p className="text-warm-500 font-bold animate-pulse text-lg">正在回忆那段时光...</p></div>
                      ) : (
                          <div className="animate-cinematic">
                              <div className="bg-white/80 p-6 rounded-[2rem] border-2 border-white shadow-sm"><div className="whitespace-pre-wrap text-warm-700 leading-relaxed font-rounded text-base">{cycleAnalysis || "由于缺少记录，这段时光略显空白。"}</div></div>
                              <div className="mt-8 flex justify-center"><div className="p-4 bg-macaron-yellow/30 rounded-2xl flex items-center space-x-3 max-w-xs"><Sparkles className="text-macaron-yellowDark shrink-0" size={24}/><p className="text-[10px] text-warm-500 font-bold italic leading-tight">复盘基于这10天的打卡表现、日记记录及心境综合生成</p></div></div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default GrowthTracks;
