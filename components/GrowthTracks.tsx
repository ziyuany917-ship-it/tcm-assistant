import React, { useState } from 'react';
import { Habit, DoneItem, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';
import { Sprout, Flag, X, Plus, Check, ChevronDown, ChevronUp, PieChart, Target, Sparkles, Loader2 } from 'lucide-react';

interface GrowthTracksProps {
  apiKey: string;
  doneItems: DoneItem[];
  setDoneItems: (items: DoneItem[]) => void;
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

const GrowthTracks: React.FC<GrowthTracksProps> = ({ 
  apiKey, 
  doneItems, 
  setDoneItems, 
  habits, 
  setHabits, 
  profile, 
  setProfile 
}) => {
  // --- UI State ---
  const [isDoneListExpanded, setIsDoneListExpanded] = useState(false); 
  const [isTimeWheelExpanded, setIsTimeWheelExpanded] = useState(false); 
  
  // --- Done List State ---
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemHours, setNewItemHours] = useState('');

  // --- Goal State ---
  // Derive goals directly from profile prop
  const goals = profile.goals || '';
  
  const [isGoalEditing, setIsGoalEditing] = useState(false);
  const [goalAdvice, setGoalAdvice] = useState('');
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);

  // Update goals via setProfile prop (MainLayout will sync to cloud)
  const handleGoalsChange = (newGoals: string) => {
      setProfile({ ...profile, goals: newGoals });
  };
  
  const today = new Date().toLocaleDateString('zh-CN');
  const todaysItems = doneItems.filter(i => i.date === today);

  const handleAddItem = () => {
    if (newItemName && newItemHours) {
        const item: DoneItem = {
            id: Date.now().toString(),
            date: today,
            activity: newItemName,
            hours: parseFloat(newItemHours),
            completed: true
        };
        setDoneItems([item, ...doneItems]);
        setNewItemName('');
        setNewItemHours('');
        setIsAddingItem(false);
    }
  };

  const deleteItem = (id: string) => {
    setDoneItems(doneItems.filter(i => i.id !== id));
  };

  const handleGetGoalAdvice = async () => {
      if(!goals.trim()) return;
      if(!apiKey) { alert("请先在侧边栏设置 Key 哦~"); return; }
      
      setIsGettingAdvice(true);
      try {
          const service = new GeminiService(apiKey);
          // Just pass empty logs for now as we don't have logs prop here, 
          // or we could ask MainLayout to pass logs too.
          // For simplicity, we just use the profile context.
          const advice = await service.generateGoalAdvice(goals, profile, []);
          setGoalAdvice(advice);
      } catch(e) {
          console.error(e);
      } finally {
          setIsGettingAdvice(false);
      }
  };


  // --- Habit Tracks Logic ---
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

    if (actualDayOfYear > currentDayOfYear) {
        alert("不能提前打卡哦，活在当下。");
        return;
    }

    const updated = habits.map(h => {
        if (h.id === habitId) {
            const currentHistory = h.history[cycleId] || Array(10).fill(false);
            const newHistory = [...currentHistory];
            newHistory[dayIndex] = !newHistory[dayIndex];
            return {
                ...h,
                history: {
                    ...h.history,
                    [cycleId]: newHistory
                }
            };
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full overflow-y-auto no-scrollbar space-y-8 bg-paper">
      <header className="flex items-end justify-between">
        <div>
            <h2 className="text-3xl font-rounded font-bold text-warm-800 flex items-center">
                <Sprout className="mr-3 text-macaron-yellowDark" />
                元气养成记 ✨
            </h2>
            <p className="text-warm-500 text-sm mt-1 ml-10">日拱一卒 · 36个周期的修行</p>
        </div>
      </header>

      {/* --- Section 0: Goal Setting --- */}
      <section className="bg-white p-6 rounded-[2rem] shadow-sticker border-2 border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-macaron-peach/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="text-xl font-rounded font-bold text-warm-700 flex items-center">
                  <Target className="mr-2 text-macaron-peachDark"/> 年度愿望清单
              </h3>
              <button 
                  onClick={() => setIsGoalEditing(!isGoalEditing)}
                  className="text-warm-400 hover:text-warm-600 text-sm underline decoration-dashed"
              >
                  {isGoalEditing ? '完成' : '编辑目标'}
              </button>
          </div>

          {isGoalEditing ? (
              <textarea 
                  value={goals}
                  onChange={e => handleGoalsChange(e.target.value)}
                  placeholder="例如：今年想瘦10斤，或者不再失眠..."
                  className="w-full bg-macaron-cream border border-warm-200 rounded-2xl p-4 text-warm-800 outline-none focus:ring-2 focus:ring-macaron-yellow transition-all"
                  rows={3}
              />
          ) : (
              <div className="bg-macaron-cream/50 p-4 rounded-2xl border border-warm-100 text-warm-800 min-h-[60px] flex items-center">
                  {goals ? goals : <span className="text-warm-300 italic">点击右上角写下你的愿望吧...</span>}
              </div>
          )}

          {/* AI Advice Area */}
          <div className="mt-4 flex flex-col md:flex-row gap-4 items-start">
              <button 
                  onClick={handleGetGoalAdvice}
                  disabled={!goals || isGettingAdvice}
                  className="bg-macaron-peach hover:bg-macaron-peachDark hover:text-white text-macaron-peachDark font-bold py-2 px-4 rounded-2xl shadow-sm hover:shadow-sticker transition-all flex items-center text-sm whitespace-nowrap"
              >
                  {isGettingAdvice ? <Loader2 className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                  {isGettingAdvice ? '老己思考中...' : '老己，给点建议？'}
              </button>
              
              {goalAdvice && (
                  <div className="flex-1 bg-white border border-macaron-blue p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-warm-700 leading-relaxed animate-cinematic relative">
                      <div className="absolute -top-3 -left-1 text-macaron-blue text-xs font-bold bg-white px-2 rounded-full border border-macaron-blue">Tips</div>
                      <div className="whitespace-pre-wrap">{goalAdvice}</div>
                  </div>
              )}
          </div>
      </section>


      {/* --- Section 1: Collapsible Daily Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Done List (Compact & Cute) */}
        <div className={`bg-macaron-mint/20 rounded-[2rem] shadow-sticker border-2 border-white transition-all duration-300 overflow-hidden flex flex-col ${isDoneListExpanded ? 'p-6' : 'p-5'}`}>
            <div 
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsDoneListExpanded(!isDoneListExpanded)}
            >
                <div className="flex items-center space-x-2">
                    <div className="bg-white p-2 rounded-full text-macaron-mintDark shadow-sm"><Check size={18}/></div>
                    <h3 className="text-warm-800 font-rounded font-bold text-lg">今日成就</h3>
                    <span className="text-xs text-white bg-macaron-mintDark/40 px-2 py-0.5 rounded-full font-bold">
                        {todaysItems.length}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsAddingItem(!isAddingItem); setIsDoneListExpanded(true); }} 
                        className="text-macaron-mintDark bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
                    >
                        {isAddingItem ? <X size={18}/> : <Plus size={18}/>}
                    </button>
                    <button className="text-warm-400">
                        {isDoneListExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                </div>
            </div>

            {/* Input Area */}
            {isAddingItem && (
                <div className="mt-4 mb-2 bg-white p-3 rounded-2xl animate-cinematic border border-dashed border-macaron-mintDark/30">
                    <div className="flex items-center space-x-2">
                        <input 
                           className="flex-1 bg-transparent border-b border-warm-200 text-sm p-1 outline-none text-warm-800 placeholder-warm-400" 
                           placeholder="做了什么？"
                           autoFocus
                           value={newItemName} onChange={e => setNewItemName(e.target.value)}
                        />
                         <input 
                            className="w-16 bg-transparent border-b border-warm-200 text-sm p-1 outline-none text-warm-800 placeholder-warm-400 text-center" 
                            placeholder="h" type="number"
                            value={newItemHours} onChange={e => setNewItemHours(e.target.value)}
                         />
                         <button onClick={handleAddItem} className="bg-macaron-mintDark text-white p-1.5 rounded-full hover:bg-warm-600 shadow-sm"><Check size={14}/></button>
                    </div>
                </div>
            )}

            {/* List Content */}
            <div className={`mt-2 space-y-2 transition-all duration-500 ease-in-out ${isDoneListExpanded ? 'max-h-[500px] opacity-100' : 'max-h-[80px] overflow-hidden'}`}>
                {todaysItems.length === 0 && !isAddingItem && (
                    <p className="text-center text-warm-400 text-xs py-4 italic">今天还没有记录哦，是一张白纸呢~</p>
                )}
                {todaysItems.map((item, idx) => (
                    <div key={item.id} className="group flex justify-between items-center py-2 px-3 bg-white/60 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-macaron-mint">
                        <div className="flex items-center space-x-3">
                            <span className="text-macaron-mintDark/50 text-xs font-bold font-mono">{idx + 1}.</span>
                            <span className="text-sm font-medium text-warm-700">{item.activity}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                             <span className="text-xs text-warm-500 font-bold bg-macaron-mint/30 px-2 py-1 rounded-lg">{item.hours}h</span>
                             {isDoneListExpanded && (
                                <button onClick={() => deleteItem(item.id)} className="text-warm-300 hover:text-red-400 transition-colors">
                                    <X size={14}/>
                                </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Time Wheel (Collapsible) */}
        <div className={`bg-macaron-yellow/20 rounded-[2rem] shadow-sticker border-2 border-white transition-all duration-300 flex flex-col ${isTimeWheelExpanded ? 'p-6' : 'p-5'}`}>
            <div 
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setIsTimeWheelExpanded(!isTimeWheelExpanded)}
            >
                <div className="flex items-center space-x-2">
                     <div className="bg-white p-2 rounded-full text-macaron-yellowDark shadow-sm"><PieChart size={18}/></div>
                     <h3 className="text-warm-800 font-rounded font-bold text-lg">时间甜甜圈</h3>
                </div>
                <button className="text-warm-400">
                    {isTimeWheelExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>
            </div>

            {isTimeWheelExpanded && (
                <div className="mt-6 flex flex-col items-center justify-center animate-cinematic">
                    <div 
                      className="w-48 h-48 rounded-full shadow-inner relative transition-all duration-500 border-[6px] border-white shadow-warm-100"
                      style={{
                        background: todaysItems.length ? `conic-gradient(${todaysItems.map((item, index, arr) => {
                            const total = arr.reduce((acc, curr) => acc + (curr.hours || 0), 0) || 1; 
                            const start = arr.slice(0, index).reduce((acc, curr) => acc + ((curr.hours||0)/total)*100, 0);
                            const end = start + ((item.hours||0)/total)*100;
                            const colors = ['#FFF9C4', '#FFE082', '#FFCC80', '#FFAB91', '#EF9A9A'];
                            return `${colors[index % colors.length]} ${start}% ${end}%`;
                        }).join(', ')})` : '#FFF9C4'
                      }}
                    >
                        <div className="absolute inset-0 m-[25%] bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                            <span className="text-2xl font-bold text-warm-600 font-rounded">
                                 {todaysItems.reduce((acc, i) => acc + i.hours, 0).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-warm-400 uppercase tracking-wider font-bold">Hours</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>


      {/* --- Section 2: Habit Tracker --- */}
      <section className="bg-white p-6 rounded-[2rem] shadow-sticker border-2 border-white">
         <div className="flex justify-between items-center mb-6">
             <div className="flex items-center space-x-2">
                 <div className="bg-macaron-blue text-macaron-blueDark px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                     进行中
                 </div>
                 <h3 className="text-xl font-rounded font-bold text-warm-800">第 {currentCycleIndex} 周期</h3>
                 <span className="text-warm-400 text-sm hidden md:inline ml-2 bg-warm-50 px-2 py-0.5 rounded-lg">
                    {getCycleDateRange(currentCycleIndex)}
                 </span>
             </div>
         </div>

         <div className="space-y-6">
             {habits.map(habit => (
                 <div key={habit.id} className="bg-warm-50/50 p-3 rounded-2xl">
                     <div className="flex justify-between mb-3 px-1">
                         <span className="font-bold text-warm-700 ml-1">{habit.name}</span>
                         <span className="text-xs text-warm-400 font-mono bg-white px-2 py-1 rounded-full shadow-sm">
                             {habit.history[currentCycleIndex]?.filter(Boolean).length || 0}/10
                         </span>
                     </div>
                     <div className="grid grid-cols-10 gap-2">
                         {Array.from({length: 10}, (_, i) => i).map(dayIdx => {
                             const isDone = habit.history[currentCycleIndex]?.[dayIdx] || false;
                             const startDayOfCycle = (currentCycleIndex - 1) * 10;
                             const actualDayOfYear = startDayOfCycle + dayIdx + 1;
                             const isFuture = actualDayOfYear > currentDayOfYear;

                             return (
                                 <button
                                    key={dayIdx}
                                    onClick={() => toggleDay(habit.id, dayIdx, currentCycleIndex)}
                                    disabled={isFuture && !isDone}
                                    className={`aspect-square rounded-xl transition-all duration-300 flex items-center justify-center relative
                                        ${isFuture ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:-translate-y-1'}
                                        ${isDone 
                                          ? 'bg-macaron-yellowDark text-white shadow-md' 
                                          : 'bg-white border-2 border-warm-100 text-warm-300 hover:border-macaron-yellow'
                                        }
                                    `}
                                 >
                                     {isDone && <Flag size={16} className="animate-float" />}
                                     {!isDone && !isFuture && <span className="text-[10px] text-warm-300 font-bold">{dayIdx+1}</span>}
                                 </button>
                             )
                         })}
                     </div>
                 </div>
             ))}
         </div>
      </section>
    </div>
  );
};

export default GrowthTracks;