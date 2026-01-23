import React, { useState, useEffect } from 'react';
import { ArrowRight, Leaf, Wind, Lock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthPageProps {
  onLogin: (username: string, isNewUser: boolean) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bgImage, setBgImage] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const images = [
      "https://pic3.zhimg.com/50/v2-91f9f38936297d1d405e8982055637fd_hd.jpg?source=1940ef5c", 
      "https://c-ssl.duitang.com/uploads/item/201804/22/20180422154334_tuwcR.jpeg", 
      "https://th.bing.com/th/id/OIP.q_4w4yzvEKGlGzG_bV-GHgAAAA?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3" 
    ];
    setBgImage(images[Math.floor(Math.random() * images.length)]);
  }, []);

  const handleAuth = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setErrorMsg('');

    try {
        // 1. Try to fetch user
        const { data, error } = await supabase
            .from('app_users')
            .select('password')
            .eq('username', username.trim())
            .single();

        if (error && error.code !== 'PGRST116') {
            // Real error (connection etc)
            throw error;
        }

        if (data) {
            // User exists, check password
            if (data.password === password.trim()) {
                enterApp(false);
            } else {
                setErrorMsg("密码不对哦，再想想？");
            }
        } else {
            // User does not exist, Register new
            const { error: insertError } = await supabase
                .from('app_users')
                .insert([{ username: username.trim(), password: password.trim() }]);
            
            if (insertError) throw insertError;
            alert("✨ 欢迎新朋友！已为你创建账号。");
            enterApp(true);
        }

    } catch (err: any) {
        console.error(err);
        setErrorMsg("连接云端失败，请检查网络或 Supabase 配置。");
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

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center text-white transition-all duration-1000 ${isFading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-warm-900/50 mix-blend-overlay pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md px-6 animate-cinematic">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-white/20 backdrop-blur-md rounded-full mb-6 shadow-lg border border-white/40 animate-float">
                <Leaf className="text-white mr-2" size={32} />
                <Wind className="text-white" size={32} />
            </div>
            <h1 className="text-6xl md:text-8xl font-rounded font-bold text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)] tracking-widest mb-4 whitespace-nowrap">
              爱你老己
            </h1>
            <p className="font-rounded text-xl md:text-2xl text-white/95 drop-shadow-md font-medium tracking-wide bg-black/10 px-6 py-2 rounded-full inline-block backdrop-blur-sm">
              “云端漫步，安全守护。”
            </p>
        </div>

        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 rounded-[3rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
            <form onSubmit={handleAuth} className="flex flex-col space-y-6">
                <div className="space-y-2">
                    <label className="text-white text-xs font-bold uppercase tracking-wider pl-4">您的名字 / ID</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="例如：小梅"
                        className="w-full bg-white/70 border-2 border-white/50 rounded-2xl px-6 py-3 text-warm-900 placeholder-warm-500/60 focus:outline-none focus:bg-white focus:border-white focus:ring-4 focus:ring-white/30 transition-all font-bold text-lg text-center shadow-inner"
                        autoFocus
                    />
                </div>
                
                <div className="space-y-2">
                     <label className="text-white text-xs font-bold uppercase tracking-wider pl-4 flex items-center"><Lock size={12} className="mr-1"/> 密语 / Password</label>
                     <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="只有你知道的秘密"
                        className="w-full bg-white/70 border-2 border-white/50 rounded-2xl px-6 py-3 text-warm-900 placeholder-warm-500/60 focus:outline-none focus:bg-white focus:border-white focus:ring-4 focus:ring-white/30 transition-all font-bold text-lg text-center shadow-inner"
                    />
                </div>

                {errorMsg && <p className="text-red-100 bg-red-500/50 px-2 py-1 rounded-lg text-center text-sm font-bold">{errorMsg}</p>}

                <button 
                  type="submit"
                  disabled={!username || !password || loading}
                  className="group w-full py-4 bg-macaron-peachDark hover:bg-red-500 text-white rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {loading ? (
                      <span>连接云端...</span>
                  ) : (
                      <>
                        <span>开启旅程</span>
                        <ArrowRight size={24} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                  )}
                </button>
            </form>
        </div>
        
        <div className="mt-8 text-center text-white/80 text-xs font-bold drop-shadow-sm">
             <p>数据加密存储于 Supabase ☁️ | 首次输入即自动注册</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;