"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import fightEast from './assets/spearman/fight-stance-east.gif';
import fightWest from './assets/spearman/fight-stance-west.gif';

export default function Home() {
  const router = useRouter();
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');

  const handleStart = () => {
    const params = new URLSearchParams();
    if (p1Name) params.set('p1', p1Name);
    if (p2Name) params.set('p2', p2Name);
    router.push(`/duel?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-t from-slate-900 to-black text-white overflow-hidden relative flex justify-center items-center font-sans">
      {/* Decorative background elements */}
      <div className="absolute -top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="relative z-10 max-w-6xl w-full px-8 py-16 flex flex-col items-center">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl mb-4 animate-fade-in-down">
            MATH <span className="text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]">ARENA</span>
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto animate-fade-in-up delay-300 fill-mode-backwards">
            Sharpen your mind. Annihilate your opponent.<br />
            Compete in real-time 1v1 math battles!
          </p>

          <div className="flex justify-center items-center gap-4 md:gap-12 mb-12 animate-fade-in-up delay-500 fill-mode-backwards">
            <img src={fightEast.src} alt="Spearman Left" className="h-[120px] md:h-[200px] drop-shadow-[0_20px_10px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform duration-300" />
            <div className="text-4xl md:text-6xl font-black text-yellow-400 italic drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">VS</div>
            <img src={fightWest.src} alt="Spearman Right" className="h-[120px] md:h-[200px] drop-shadow-[0_20px_10px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform duration-300" />
          </div>

          <div className="flex flex-col items-center gap-6 animate-fade-in-up delay-700 fill-mode-backwards">
            <div className="flex flex-col md:flex-row gap-4 w-full max-w-md justify-center">
              <input 
                type="text" 
                placeholder="Player A Name" 
                value={p1Name} 
                onChange={(e) => setP1Name(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-emerald-500 transition-colors w-full md:w-1/2"
                maxLength={12}
              />
              <input 
                type="text" 
                placeholder="Player B Name" 
                value={p2Name} 
                onChange={(e) => setP2Name(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-rose-500 transition-colors w-full md:w-1/2"
                maxLength={12}
              />
            </div>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <button onClick={handleStart} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-5 text-lg font-extrabold rounded-full uppercase tracking-widest shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300">
                Local 1v1
              </button>
              <button onClick={() => router.push(`/online?name=${p1Name || 'Player'}`)} className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white px-8 py-5 text-lg font-extrabold rounded-full uppercase tracking-widest shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300">
                Play Online
              </button>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-fade-in-up delay-1000 fill-mode-backwards">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:-translate-y-2 hover:bg-white/10 transition-all duration-300">
            <h3 className="text-2xl font-bold text-emerald-400 mb-4">🧠 Fast-Paced Math</h3>
            <p className="text-slate-400 leading-relaxed">Solve equations under pressure. Speed equals power!</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:-translate-y-2 hover:bg-white/10 transition-all duration-300">
            <h3 className="text-2xl font-bold text-emerald-400 mb-4">⚔️ Local 1v1 PvP</h3>
            <p className="text-slate-400 leading-relaxed">Share a keyboard and battle your friends on the same screen.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:-translate-y-2 hover:bg-white/10 transition-all duration-300">
            <h3 className="text-2xl font-bold text-emerald-400 mb-4">🔥 Dynamic Combos</h3>
            <p className="text-slate-400 leading-relaxed">Chain correct answers together to unleash devastating attacks.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
