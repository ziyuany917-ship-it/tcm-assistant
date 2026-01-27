import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';
import { X, Send, Loader2, Wind, Sparkles } from 'lucide-react';

interface AwarenessSpaceProps {
    apiKey: string;
    onClose: (summary: string) => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const AwarenessSpace: React.FC<AwarenessSpaceProps> = ({ apiKey, onClose }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Greeting
    useEffect(() => {
        if (!apiKey) return;
        const service = new GeminiService(apiKey);
        const chatSession = service.createAwarenessChat();
        setChat(chatSession);

        if (chatSession) {
            // Fake initial streaming effect for greeting
            const greeting = "闭上眼睛，深呼吸。告诉我，此刻你的内在发生了什么？";
            setMessages([{ id: 'init', role: 'model', text: greeting }]);
        }
    }, [apiKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !chat || isSending) return;

        const userText = input;
        setInput('');
        const newHistory = [...messages, { id: Date.now().toString(), role: 'user' as const, text: userText }];
        setMessages(newHistory);
        setIsSending(true);

        try {
            const response = await chat.sendMessage({ message: userText });
            const botText = response.text || "...";
            
            setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'model', text: botText }]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    const handleExit = async () => {
        setIsExiting(true);
        const service = new GeminiService(apiKey);
        
        // Transform messages for summary
        const historyForSummary = messages.map(m => ({ role: m.role, content: m.text }));
        const summary = await service.summarizeAwarenessSession(historyForSummary);
        
        onClose(summary);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gradient-to-b from-teal-900 to-warm-900 flex flex-col items-center justify-center text-warm-50 animate-cinematic">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Header */}
            <div className="absolute top-6 right-6 z-20">
                <button 
                    onClick={handleExit} 
                    disabled={isExiting}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full transition-all text-sm font-bold tracking-widest uppercase border border-white/10"
                >
                    {isExiting ? <Loader2 className="animate-spin" size={16}/> : <X size={18}/>}
                    <span>{isExiting ? '正在凝聚能量...' : '结束觉察'}</span>
                </button>
            </div>

            <div className="absolute top-8 left-8 z-20 opacity-50 flex items-center space-x-2">
                <Wind className="text-teal-200" />
                <span className="font-serif tracking-widest text-lg">当下</span>
            </div>

            {/* Chat Area */}
            <div className="relative z-10 w-full max-w-2xl flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 flex flex-col justify-center">
                {messages.length === 0 && (
                    <div className="text-center opacity-50 animate-pulse">
                        <Sparkles size={48} className="mx-auto mb-4 text-teal-200"/>
                        <p className="text-xl font-serif">连接高维智慧...</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-center'}`}>
                        <div 
                            className={`max-w-[80%] p-6 rounded-2xl text-lg leading-relaxed font-serif tracking-wide shadow-lg backdrop-blur-sm transition-all duration-700
                            ${msg.role === 'user' 
                                ? 'bg-white/10 text-white border border-white/10 rounded-br-none' 
                                : 'bg-transparent text-teal-50 text-center text-xl md:text-2xl font-light shadow-none'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="relative z-10 w-full max-w-xl p-8 mb-4">
                <div className="relative">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="在此刻，你感受到了什么..."
                        disabled={isSending || isExiting}
                        className="w-full bg-white/5 border-b border-white/20 py-4 px-2 text-center text-xl text-white placeholder-white/30 focus:outline-none focus:border-teal-300 focus:bg-white/10 transition-all font-serif"
                        autoFocus
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isSending || isExiting}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-teal-200 hover:text-white transition-colors disabled:opacity-30"
                    >
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </button>
                </div>
                <p className="text-center text-white/20 text-xs mt-4 tracking-[0.2em] uppercase">Breathe · Observe · Release</p>
            </div>
        </div>
    );
};

export default AwarenessSpace;