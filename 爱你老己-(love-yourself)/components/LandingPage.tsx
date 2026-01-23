import React, { useEffect, useState } from 'react';
import { GeminiService } from '../services/geminiService';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  apiKey: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter, apiKey }) => {
  const [quote, setQuote] = useState("我配得上世间所有的美好。");
  const [bgImage, setBgImage] = useState("");
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Specific Miyazaki / Studio Ghibli vibes: Summer, Clouds, Grass
    const images = [
      "https://images.unsplash.com/photo-1621516088232-a5e12e022b40?q=80&w=2670&auto=format&fit=crop", // Big cloud blue sky
      "https://images.unsplash.com/photo-1596323602059-43c240d44eb3?q=80&w=2574&auto=format&fit=crop", // Green field anime style
      "https://images.unsplash.com/photo-1629814681602-eee335e263c9?q=80&w=2574&auto=format&fit=crop", // Summer sky
      "https://images.unsplash.com/photo-1517685352821-92cf88a85a8d?q=80&w=2525&auto=format&fit=crop"  // Soft field
    ];
    setBgImage(images[Math.floor(Math.random() * images.length)]);

    if (apiKey) {
      const service = new GeminiService(apiKey);
      service.getDailyQuote().then(q => setQuote(q));
    }
  }, [apiKey]);

  const handleEnter = () => {
    setIsFading(true);
    setTimeout(onEnter, 1000);
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center text-white transition-all duration-1000 ${isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-blue-300/20 via-transparent to-warm-900/40 mix-blend-overlay pointer-events-none" />
      
      <div className="relative z-10 px-8 text-center max-w-2xl animate-cinematic flex flex-col items-center">
        <div className="mb-16">
            <h1 className="text-6xl md:text-9xl font-serif font-bold text-white drop-shadow-xl tracking-widest mb-6 opacity-95">
              爱你老己
            </h1>
            <div className="w-24 h-1.5 bg-white/80 mx-auto rounded-full shadow-lg mb-8"></div>
            <p className="font-serif text-xl md:text-3xl leading-relaxed tracking-wide text-white drop-shadow-md font-medium italic">
              “{quote}”
            </p>
        </div>
        
        <button 
          onClick={handleEnter}
          className="group relative px-12 py-4 bg-white/30 backdrop-blur-sm border-2 border-white/80 rounded-full hover:bg-white/50 transition-all duration-500 overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.6)]"
        >
          <div className="flex items-center space-x-3 text-white">
            <span className="text-xl font-bold tracking-[0.2em] uppercase text-shadow">回家</span>
            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default LandingPage;