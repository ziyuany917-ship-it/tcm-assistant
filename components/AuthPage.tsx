import React, { useState, useEffect } from 'react';
import { ArrowRight, Wind, Sparkles, ChevronLeft, ShieldCheck, User, Lock, Fingerprint } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthPageProps {
  onLogin: (username: string, isNewUser: boolean) => void;
}

const LOA_QUOTES = [
  "心念所至，万物生光。",
  "你所关注的，必将扩张。",
  "我本具足，无需外求。",
  "像已经拥有那样去活。",
  "宇宙正在回应你的频率。",
  "相信即是看见。",
  "一切都是最好的安排。",
  "爱自己，是终身浪漫的开始。",
  "同频相吸，美好正在奔你而来。",
  "放松，允许一切发生。",
];

const SECURITY_QUESTIONS = [
  "你最喜欢的食物是什么？",
  "你小时候的梦想是什么？",
  "你最想去的城市是哪里？",
  "你的初恋叫什么名字？",
  "你第一只宠物的名字是？"
];

const GITHUB_REPO_BASE = "https://raw.githubusercontent.com/ziyuany917-ship-it/tcm-assistant/main/bg%20image/";
const MAX_IMAGE_INDEX = 35; 
const FALLBACK_IMAGES = [
  "https://pic3.zhimg.com/50/v2-91f9f38936297d1d405e8982055637fd_hd.jpg?source=1940ef5c", 
  "https://c-ssl.duitang.com/uploads/item/201804/22/20180422154334_tuwcR.jpeg" 
];

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_FIND' | 'FORGOT_VERIFY' | 'FORGOT_RESET';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Form Data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Security Question Data
  const [securityQ, setSecurityQ] = useState(SECURITY_QUESTIONS[0]);
  const [customQ, setCustomQ] = useState(''); 
  const [securityA, setSecurityA] = useState('');
  
  // Recovery Data
  const [retrievedQuestion, setRetrievedQuestion] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI State
  const [bgImage, setBgImage] = useState("");
  const [currentQuote, setCurrentQuote] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setCurrentQuote(LOA_QUOTES[Math.floor(Math.random() * LOA_QUOTES.length)]);
    const loadBgImage = (retries = 3) => {
        const randomId = Math.floor(Math.random() * MAX_IMAGE_INDEX) + 1;
        const fullUrl = `${GITHUB_REPO_BASE}${randomId}.jpg`;
        const img = new Image();
        img.src = fullUrl;
        img.onload = () => setBgImage(fullUrl);
        img.onerror = () => {
            if (retries > 0) loadBgImage(retries - 1);
            else setBgImage(FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)]);
        };
    };
    loadBgImage();
  }, []);

  const resetState = () => {
      setErrorMsg('');
      setSuccessMsg('');
      setPassword('');
      setSecurityA('');
      setNewPassword('');
  };

  const switchMode = (newMode: AuthMode) => {
      resetState();
      setMode(newMode);
  };

  // --- Actions ---

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username || !password) {
          setErrorMsg("请输入账号和密码");
          return;
      }
      setLoading(true);
      setErrorMsg('');

      try {
          const { data } = await supabase
              .from('app_users')
              .select('password, settings')
              .eq('username', username.trim())
              .maybeSingle();

          if (data && data.password === password.trim()) {
               // Check if user has security answer (legacy support or forced update logic could go here)
               enterApp(false);
          } else {
              setErrorMsg("账号或密码错误");
          }
      } catch (err) {
          setErrorMsg("连接失败，请检查网络");
      } finally {
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      const finalQuestion = securityQ === 'custom' ? customQ.trim() : securityQ;

      if (!username || !password) {
          setErrorMsg("请完善账号信息");
          return;
      }
      if (!finalQuestion || !securityA) {
          setErrorMsg("请设置密保，用于找回密码");
          return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
          const { error } = await supabase
              .from('app_users')
              .insert([{ 
                  username: username.trim(), 
                  password: password.trim(),
                  settings: {
                      security_question: finalQuestion,
                      security_answer: securityA.trim()
                  }
              }]);
          
          if (error) throw error;
          
          setSuccessMsg("✨ 欢迎开启新旅程！");
          setTimeout(() => enterApp(true), 1200);

      } catch (err: any) {
          if (err.code === '23505' || err.message?.includes('duplicate')) {
             setErrorMsg("这个名字太火爆啦，已经有人用了，换一个试试吧！");
          } else {
             setErrorMsg("注册失败，请稍后再试");
          }
      } finally {
          setLoading(false);
      }
  };

  // Recovery Step 1: Find User & Get Question
  const handleFindUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username) return setErrorMsg("请输入您的账号");
      
      setLoading(true);
      setErrorMsg('');
      try {
          const { data } = await supabase.from('app_users').select('settings').eq('username', username.trim()).single();
          const q = (data?.settings as any)?.security_question;
          
          if (q) {
              setRetrievedQuestion(q);
              setMode('FORGOT_VERIFY');
          } else {
              setErrorMsg("该账号未设置密保，无法自动找回");
          }
      } catch {
          setErrorMsg("找不到该账号");
      } finally {
          setLoading(false);
      }
  };

  // Recovery Step 2: Verify Answer
  const handleVerifyAnswer = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setErrorMsg('');
      try {
          const { data } = await supabase.from('app_users').select('settings').eq('username', username.trim()).single();
          const trueAnswer = (data?.settings as any)?.security_answer;
          
          if (trueAnswer && trueAnswer === securityA.trim()) {
              setMode('FORGOT_RESET');
          } else {
              setErrorMsg("答案不正确");
          }
      } catch {
          setErrorMsg("验证出错");
      } finally {
          setLoading(false);
      }
  };

  // Recovery Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword) return setErrorMsg("请设置新密码");
      
      setLoading(true);
      try {
          const { error } = await supabase
            .from('app_users')
            .update({ password: newPassword.trim() })
            .eq('username', username.trim());
          
          if (error) throw error;
          
          setSuccessMsg("✨ 密码重置成功");
          setTimeout(() => {
              switchMode('LOGIN');
          }, 1500);
      } catch {
          setErrorMsg("重置失败");
      } finally {
          setLoading(false);
      }
  };

  const enterApp = (isNew: boolean) => {
      setIsFading(true);
      setTimeout(() => {
        onLogin(username.trim(), isNew);
      }, 800);
  };

  // --- Styles ---
  const InputClass = "w-full bg-white/70 border-2 border-white/50 rounded-2xl px-5 py-3 text-warm-900 placeholder-warm-400 focus:outline-none focus:bg-white focus:border-macaron-blue focus:ring-4 focus:ring-white/30 transition-all font-bold text-lg text-center shadow-inner";
  const LabelClass = "text-white text-xs font-bold uppercase tracking-wider pl-4 flex items-center mb-1 shadow-black/20 drop-shadow-md";

  return (
    <div 
      className={`fixed inset-0 z-[100] overflow-y-auto no-scrollbar transition-all duration-1000 ${isFading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundColor: '#4a2610',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="fixed inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-warm-900/60 mix-blend-overlay pointer-events-none" />
      
      <div className="min-h-full flex flex-col items-center justify-center py-10 px-6 relative z-10">
        <div className="w-full max-w-md animate-cinematic">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-md rounded-full mb-4 shadow-lg border border-white/40 animate-float">
                    <Sparkles className="text-yellow-200 mr-2" size={24} />
                    <Wind className="text-white" size={24} />
                </div>
                <h1 className="text-4xl md:text-6xl font-rounded font-bold text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] tracking-widest mb-3 whitespace-nowrap">
                爱你老己
                </h1>
                <p className="font-serif text-sm md:text-base text-white/95 drop-shadow-md font-medium tracking-wide bg-black/10 px-4 py-1.5 rounded-full inline-block backdrop-blur-sm">
                “{currentQuote}”
                </p>
            </div>

            {/* Dynamic Card */}
            <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500">
                
                {/* --- MODE: LOGIN --- */}
                {mode === 'LOGIN' && (
                    <form onSubmit={handleLogin} className="flex flex-col space-y-5 animate-cinematic">
                        <div className="text-center mb-2">
                            <h2 className="text-white font-bold text-2xl drop-shadow-md">欢迎回家</h2>
                            <p className="text-white/80 text-sm">Welcome Back</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={LabelClass}><User size={12} className="mr-1"/> 账号</label>
                                <input value={username} onChange={e => setUsername(e.target.value)} className={InputClass} placeholder="您的名字" />
                            </div>
                            <div>
                                <label className={LabelClass}><Lock size={12} className="mr-1"/> 密语</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={InputClass} placeholder="密码" />
                            </div>
                        </div>

                        {errorMsg && <p className="text-red-100 bg-red-500/50 px-3 py-2 rounded-xl text-center text-sm font-bold animate-pulse">{errorMsg}</p>}
                        {successMsg && <p className="text-green-100 bg-green-500/50 px-3 py-2 rounded-xl text-center text-sm font-bold">{successMsg}</p>}

                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-macaron-peachDark hover:bg-red-500 text-white rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50">
                            {loading ? <Fingerprint className="animate-spin"/> : <><ArrowRight className="mr-2"/> 登录</>}
                        </button>

                        <div className="flex flex-col items-center space-y-3 pt-2">
                             <button type="button" onClick={() => switchMode('FORGOT_FIND')} className="text-white/70 hover:text-white text-xs underline decoration-dotted">
                                忘记密码?
                             </button>
                             <div className="w-full border-t border-white/20"></div>
                             <div className="text-center">
                                <span className="text-white/80 text-sm">还没有通行证？</span>
                                <button type="button" onClick={() => switchMode('REGISTER')} className="ml-2 text-yellow-200 hover:text-white font-bold text-sm underline hover:scale-105 transition-transform inline-block">
                                   👉 点此开启旅程 (注册)
                                </button>
                             </div>
                        </div>
                    </form>
                )}

                {/* --- MODE: REGISTER --- */}
                {mode === 'REGISTER' && (
                    <form onSubmit={handleRegister} className="flex flex-col space-y-4 animate-cinematic">
                        <div className="text-center mb-1">
                            <h2 className="text-white font-bold text-2xl drop-shadow-md">开启新旅程</h2>
                            <p className="text-white/80 text-sm">Create Account</p>
                        </div>

                        <div className="space-y-3">
                            <input value={username} onChange={e => setUsername(e.target.value)} className={`${InputClass} py-2.5 text-base`} placeholder="设置名字" />
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${InputClass} py-2.5 text-base`} placeholder="设置密码" />
                            
                            {/* Embedded Security Setup */}
                            <div className="bg-white/20 p-3 rounded-2xl border border-white/30">
                                <label className="text-yellow-100 text-[10px] font-bold uppercase mb-2 block flex items-center">
                                    <ShieldCheck size={10} className="mr-1"/> 设置密保 (用于找回密码)
                                </label>
                                <select 
                                    value={securityQ} 
                                    onChange={e => {
                                        setSecurityQ(e.target.value);
                                        if (e.target.value !== 'custom') setCustomQ('');
                                    }} 
                                    className="w-full bg-white/80 rounded-xl px-2 py-2 mb-2 text-warm-900 text-xs font-bold outline-none cursor-pointer hover:bg-white"
                                >
                                    {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                    <option value="custom">✍️ 自定义问题...</option>
                                </select>
                                {securityQ === 'custom' && (
                                    <input 
                                        value={customQ} onChange={e => setCustomQ(e.target.value)}
                                        className="w-full bg-white rounded-xl px-2 py-2 mb-2 text-warm-900 text-xs font-bold outline-none text-center"
                                        placeholder="输入自定义问题"
                                    />
                                )}
                                <input 
                                    value={securityA} onChange={e => setSecurityA(e.target.value)} 
                                    className="w-full bg-white rounded-xl px-2 py-2 text-warm-900 text-xs font-bold outline-none text-center placeholder-warm-300"
                                    placeholder="输入您的答案"
                                />
                            </div>
                        </div>

                        {errorMsg && <p className="text-red-100 bg-red-500/50 px-2 py-1 rounded-lg text-center text-xs font-bold animate-pulse">{errorMsg}</p>}

                        <button type="submit" disabled={loading} className="w-full py-3 bg-macaron-mintDark hover:bg-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-all hover:scale-105">
                             {loading ? '创建中...' : '✨ 立即注册'}
                        </button>

                        <div className="text-center pt-2">
                            <span className="text-white/80 text-sm">已有通行证？</span>
                            <button type="button" onClick={() => switchMode('LOGIN')} className="ml-2 text-yellow-200 hover:text-white font-bold text-sm underline">
                                👉 返回登录
                            </button>
                        </div>
                    </form>
                )}

                {/* --- MODE: RECOVERY FLOW --- */}
                {(mode.startsWith('FORGOT')) && (
                    <div className="animate-cinematic space-y-4">
                        <div className="flex items-center justify-between">
                            <button onClick={() => switchMode('LOGIN')} className="text-white hover:text-yellow-200"><ChevronLeft/></button>
                            <h2 className="text-white font-bold text-xl drop-shadow-md">找回密码</h2>
                            <div className="w-6"></div>
                        </div>

                        {/* Step 1: Input Username */}
                        {mode === 'FORGOT_FIND' && (
                            <form onSubmit={handleFindUser} className="space-y-4">
                                <p className="text-white/90 text-center text-sm">请输入您要找回的账号</p>
                                <input value={username} onChange={e => setUsername(e.target.value)} className={InputClass} placeholder="您的名字" />
                                {errorMsg && <p className="text-red-100 bg-red-500/50 px-2 py-1 rounded-lg text-center text-xs font-bold">{errorMsg}</p>}
                                <button disabled={loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg">
                                    {loading ? '查找中...' : '下一步'}
                                </button>
                            </form>
                        )}

                        {/* Step 2: Answer Question */}
                        {mode === 'FORGOT_VERIFY' && (
                            <form onSubmit={handleVerifyAnswer} className="space-y-4">
                                <div className="bg-white/20 p-4 rounded-2xl text-center border border-white/30">
                                    <p className="text-yellow-100 text-xs font-bold uppercase mb-1">密保问题</p>
                                    <p className="text-white font-bold text-lg">{retrievedQuestion}</p>
                                </div>
                                <input value={securityA} onChange={e => setSecurityA(e.target.value)} className={InputClass} placeholder="请输入答案" />
                                {errorMsg && <p className="text-red-100 bg-red-500/50 px-2 py-1 rounded-lg text-center text-xs font-bold">{errorMsg}</p>}
                                <button disabled={loading} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-lg">
                                    {loading ? '验证中...' : '验证答案'}
                                </button>
                            </form>
                        )}

                        {/* Step 3: Reset Password */}
                        {mode === 'FORGOT_RESET' && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <p className="text-white/90 text-center text-sm">验证通过！请设置新密码</p>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={InputClass} placeholder="新密码" />
                                {errorMsg && <p className="text-red-100 bg-red-500/50 px-2 py-1 rounded-lg text-center text-xs font-bold">{errorMsg}</p>}
                                {successMsg && <p className="text-green-100 bg-green-500/50 px-2 py-1 rounded-lg text-center text-xs font-bold">{successMsg}</p>}
                                <button disabled={loading} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-lg">
                                    {loading ? '保存中...' : '重置密码'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

            </div>
            
            <div className="mt-8 text-center text-white/60 text-[10px] font-bold drop-shadow-sm">
                <p>爱你老己 • 长期主义</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;