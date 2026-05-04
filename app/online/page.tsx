"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Asset Imports
import fightEast from '../assets/spearman/fight-stance-east.gif';
import fightWest from '../assets/spearman/fight-stance-west.gif';
import throwEast from '../assets/spearman/throwing-east.gif';
import throwWest from '../assets/spearman/throwing-west.gif';
import fireballEast from '../assets/spearman/fireball-east.gif';
import fireballWest from '../assets/spearman/fireball-west.gif';
import getUpEast from '../assets/spearman/getting-up-east.gif';
import getUpWest from '../assets/spearman/getting-up-west.gif';
import deathEast from '../assets/spearman/death-east.gif';
import deathWest from '../assets/spearman/death-west.gif';

// Audio URLs
const p1CorrectSfx = '/api/audio/fahhhhhhhhhhhhhh.mp3';
const p2CorrectSfx = '/api/audio/vine-boom.mp3';
const p1WinSfx = '/api/audio/215-winner.mp3';
const p2WinSfx = '/api/audio/award-winners-fanfare_SXgBSYC.mp3';

type PlayerState = { hp: number; combo: number; input: string; anim: 'idle' | 'throwing' | 'hit' | 'death'; feedback: string | null; };

export default function OnlineDuelPage() {
  const router = useRouter();
  
  // Multiplayer State
  const [netState, setNetState] = useState<'name_input' | 'searching' | 'connected'>('name_input');
  const [nameInput, setNameInput] = useState('');
  const [room, setRoom] = useState('');
  const [localPlayerId, setLocalPlayerId] = useState<1 | 2>(1);
  const [p1Name, setP1Name] = useState('');
  const [p2Name, setP2Name] = useState('');
  
  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const myUuidRef = useRef(`user_${Math.random().toString(36).substring(7)}`);

  // Game State
  const [status, setStatus] = useState<'waiting' | 'countdown' | 'playing' | 'animating' | 'result'>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [roundTimer, setRoundTimer] = useState(10);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(0);

  const [p1, setP1] = useState<PlayerState>({ hp: 100, combo: 0, input: '', anim: 'idle', feedback: null });
  const [p2, setP2] = useState<PlayerState>({ hp: 100, combo: 0, input: '', anim: 'idle', feedback: null });
  const [projectile, setProjectile] = useState<'none' | 'p1-to-p2' | 'p2-to-p1'>('none');

  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if name came from URL params (from Landing page)
    const params = new URLSearchParams(window.location.search);
    const initialName = params.get('name');
    if (initialName && initialName !== 'Player') setNameInput(initialName);
    
    return () => {
      if (lobbyChannelRef.current) supabase.removeChannel(lobbyChannelRef.current);
      if (gameChannelRef.current) supabase.removeChannel(gameChannelRef.current);
    };
  }, []);

  const joinMatchmaking = async () => {
    if (!nameInput.trim()) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      alert("Missing Supabase configuration! Please add keys to .env");
      return;
    }
    
    setNetState('searching');

    const lobby = supabase.channel('math-arena-lobby', { config: { presence: { key: myUuidRef.current } } });
    lobbyChannelRef.current = lobby;

    lobby
      .on('presence', { event: 'sync' }, () => {
        const state = lobby.presenceState();
        const players = Object.values(state).flat() as any[];
        
        // Find another player looking for match
        const opponent = players.find(p => p.status === 'searching' && p.uuid !== myUuidRef.current);
        
        if (opponent) {
          // We found an opponent! 
          // To avoid race conditions, the person who joined the lobby FIRST becomes the Host (Player 1)
          const isHost = myUuidRef.current < opponent.uuid; 
          
          if (isHost) {
            const newRoomId = `room_${myUuidRef.current}_${opponent.uuid}`;
            // Tell the opponent to join this room
            lobby.send({ type: 'broadcast', event: 'match_found', payload: { targetUuid: opponent.uuid, roomId: newRoomId, hostName: nameInput } });
            connectToGameRoom(newRoomId, 1, nameInput, opponent.name);
          }
        }
      })
      .on('broadcast', { event: 'match_found' }, ({ payload }) => {
        if (payload.targetUuid === myUuidRef.current) {
          // I was invited by a host! I am Player 2.
          connectToGameRoom(payload.roomId, 2, payload.hostName, nameInput);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await lobby.track({ uuid: myUuidRef.current, name: nameInput, status: 'searching' });
        }
      });
  };

  const connectToGameRoom = (roomId: string, myRole: 1 | 2, player1Name: string, player2Name: string) => {
    // Leave lobby
    if (lobbyChannelRef.current) supabase.removeChannel(lobbyChannelRef.current);
    
    setRoom(roomId);
    setLocalPlayerId(myRole);
    setP1Name(player1Name);
    setP2Name(player2Name);
    setNetState('connected');

    const gameChannel = supabase.channel(roomId);
    gameChannelRef.current = gameChannel;

    gameChannel
      .on('broadcast', { event: 'opponent_disconnected' }, () => {
        alert("Opponent disconnected!");
        window.location.reload();
      })
      .on('broadcast', { event: 'new_question' }, ({ payload }) => {
        setQuestion(payload.question);
        setAnswer(payload.answer);
        setRoundTimer(10);
        setStatus('playing');
        setP1(prev => ({ ...prev, input: '' }));
        setP2(prev => ({ ...prev, input: '' }));
      })
      .on('broadcast', { event: 'answer_submitted' }, ({ payload }) => {
        triggerCombatAnimation(payload.player, payload.isCorrect, payload.timer, payload.combo);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Start the game!
          setStatus('countdown');
          setCountdown(3);
        }
      });
  };

  const playAudio = (src: string) => {
    if (typeof window !== 'undefined') {
      const audio = new Audio(src);
      audio.play().catch(e => console.error("Audio playback failed:", e));
    }
  };

  const generateQuestion = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 12) + 1;
    let b = Math.floor(Math.random() * 12) + 1;
    if (op === '-' && a < b) { const temp = a; a = b; b = temp; }
    
    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '*') ans = a * b;

    setQuestion(`${a} ${op} ${b}`);
    setAnswer(ans);
    setRoundTimer(10);
    
    gameChannelRef.current?.send({
      type: 'broadcast',
      event: 'new_question',
      payload: { question: `${a} ${op} ${b}`, answer: ans }
    });
  };

  // Countdown effect
  useEffect(() => {
    if (status === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(t);
      } else {
        setStatus('playing');
        if (localPlayerId === 1) generateQuestion(); // Host generates question
      }
    }
  }, [status, countdown, localPlayerId]);

  // Timer effect
  useEffect(() => {
    if (status === 'playing') {
      if (roundTimer > 0) {
        roundTimerRef.current = setTimeout(() => setRoundTimer(roundTimer - 1), 1000);
        return () => { if (roundTimerRef.current) clearTimeout(roundTimerRef.current); };
      } else {
        // Time is up. Only let host emit the timeout failure to prevent double emits.
        if (localPlayerId === 1) {
          gameChannelRef.current?.send({ type: 'broadcast', event: 'answer_submitted', payload: { player: 1, isCorrect: false, timer: 0, combo: 0 } });
          setTimeout(() => { generateQuestion(); }, 2000);
        }
      }
    }
  }, [status, roundTimer, localPlayerId, room]);

  const handleInput = (val: string) => {
    if (status !== 'playing') return;
    const setP = localPlayerId === 1 ? setP1 : setP2;
    setP(prev => {
      if (val === 'clear') return { ...prev, input: '' };
      if (val === 'backspace') return { ...prev, input: prev.input.slice(0, -1) };
      if (prev.input.length < 4) return { ...prev, input: prev.input + val };
      return prev;
    });
  };

  const submitAnswer = () => {
    if (status !== 'playing') return;
    const localState = localPlayerId === 1 ? p1 : p2;
    if (!localState.input) return;

    const isCorrect = parseInt(localState.input) === answer;
    gameChannelRef.current?.send({
      type: 'broadcast',
      event: 'answer_submitted',
      payload: { player: localPlayerId, isCorrect, timer: roundTimer, combo: localState.combo }
    });
  };

  const triggerCombatAnimation = (player: 1 | 2, isCorrect: boolean, timer: number, combo: number) => {
    setStatus('animating');
    const pState = player === 1 ? p1 : p2;
    const oppState = player === 1 ? p2 : p1;
    const setP = player === 1 ? setP1 : setP2;
    const setOpp = player === 1 ? setP2 : setP1;
    
    if (isCorrect) {
      const damage = 15 + timer + (combo * 5);
      if (player === 1) playAudio(p1CorrectSfx); else playAudio(p2CorrectSfx);

      setP(prev => ({ ...prev, anim: 'throwing', combo: prev.combo + 1, feedback: 'Correct!' }));
      
      setTimeout(() => {
        setProjectile(player === 1 ? 'p1-to-p2' : 'p2-to-p1');
        setP(prev => ({ ...prev, anim: 'idle' }));
        
        setTimeout(() => {
          setProjectile('none');
          const newHp = Math.max(0, oppState.hp - damage);
          setOpp(prev => ({ ...prev, hp: newHp, anim: newHp === 0 ? 'death' : 'hit', feedback: `-${damage} HP` }));

          setTimeout(() => {
            if (newHp === 0) {
              if (player === 1) playAudio(p1WinSfx); else playAudio(p2WinSfx);
              setStatus('result');
            } else {
              setOpp(prev => ({ ...prev, anim: 'idle' }));
              setStatus('playing');
              if (localPlayerId === 1) generateQuestion();
            }
          }, 1500);
        }, 500);
      }, 600);
    } else {
      setP(prev => ({ ...prev, hp: Math.max(0, prev.hp - 5), combo: 0, input: '', anim: 'hit', feedback: 'Wrong!' }));
      setTimeout(() => {
        setP(prev => ({ ...prev, anim: prev.hp - 5 <= 0 ? 'death' : 'idle' }));
        if (pState.hp - 5 <= 0) setStatus('result');
        else setStatus('playing');
      }, 1000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
      
      const key = e.key.toLowerCase();
      const code = e.code;

      if (/^[0-9]$/.test(key) && code.startsWith('Digit')) handleInput(key);
      if (key === 'c') handleInput('clear');
      if (code === 'Backspace') handleInput('backspace');
      if (code === 'Enter' || code === 'NumpadEnter') submitAnswer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const getAnimSrc = (player: 1 | 2, state: string) => {
    const isP1 = player === 1;
    switch (state) {
      case 'idle': return isP1 ? fightEast.src : fightWest.src;
      case 'throwing': return isP1 ? throwEast.src : throwWest.src;
      case 'hit': return isP1 ? getUpEast.src : getUpWest.src;
      case 'death': return isP1 ? deathEast.src : deathWest.src;
      default: return isP1 ? fightEast.src : fightWest.src;
    }
  };

  const getHpColor = (hp: number) => hp > 50 ? 'bg-emerald-500' : hp > 20 ? 'bg-yellow-400' : 'bg-rose-500';

  const renderCalcButton = (num: string, hint: string, onClick: () => void, isClear = false, isDel = false, classNameOverride = '') => {
    let baseClass = "relative flex flex-col items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 border border-white/5 rounded-xl transition-all shadow-md h-14";
    if (isClear) baseClass = "relative flex flex-col items-center justify-center bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 active:scale-95 border border-white/5 rounded-xl transition-all shadow-md h-14";
    if (isDel) baseClass = "relative flex flex-col items-center justify-center bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 active:scale-95 border border-white/5 rounded-xl transition-all shadow-md h-14";
    return (
      <button onClick={onClick} className={`${baseClass} ${classNameOverride}`}>
        <span className={`font-bold ${isClear || isDel ? 'text-lg' : 'text-xl'}`}>{num}</span>
        <span className={`absolute bottom-1 right-2 text-[9px] font-mono opacity-50 ${isClear || isDel ? 'text-white' : 'text-emerald-400'}`}>{hint}</span>
      </button>
    );
  };

  if (netState === 'name_input') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans text-center">
        <h1 className="text-5xl font-black text-rose-500 mb-8 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]">PLAY ONLINE</h1>
        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md w-full max-w-md">
          <input 
            type="text" 
            placeholder="Enter your name..." 
            value={nameInput} 
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full bg-black/40 border border-white/20 rounded-xl px-6 py-4 text-center text-xl focus:outline-none focus:border-rose-500 transition-colors mb-6"
            maxLength={12}
            onKeyDown={(e) => { if (e.key === 'Enter') joinMatchmaking(); }}
          />
          <button 
            onClick={joinMatchmaking} 
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 text-xl font-extrabold rounded-xl uppercase tracking-widest hover:-translate-y-1 hover:scale-[1.02] transition-all shadow-[0_5px_15px_rgba(16,185,129,0.3)]"
          >
            Find Match
          </button>
          <button 
            onClick={() => router.push('/')} 
            className="w-full mt-4 text-slate-400 hover:text-white transition-colors text-sm uppercase tracking-wider"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (netState === 'searching') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white font-sans text-center">
        <h1 className="text-6xl font-black text-rose-500 mb-8 animate-pulse">MATCHMAKING</h1>
        <p className="text-2xl text-slate-400">Waiting for opponent...</p>
        <div className="mt-12 loader ease-linear rounded-full border-8 border-t-8 border-slate-700 h-24 w-24 border-t-rose-500 animate-spin"></div>
      </div>
    );
  }

  const localState = localPlayerId === 1 ? p1 : p2;

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black text-white font-sans overflow-hidden">
      {/* HUD */}
      <div className="flex justify-between items-start p-8 h-[15vh] z-10 shrink-0">
        <div className="w-[300px]">
          <div className="w-full h-6 bg-white/10 rounded-full border-2 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className={`h-full transition-all duration-300 ease-out ${getHpColor(p1.hp)}`} style={{ width: `${p1.hp}%` }}></div>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">{p1Name} - HP: {p1.hp}</div>
        </div>

        <div className="flex flex-col items-center gap-4">
          {status === 'countdown' && <div className="text-7xl font-black text-rose-500 animate-pulse drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">{countdown > 0 ? countdown : 'GO!'}</div>}
          {(status === 'playing' || status === 'animating') && (
            <>
              <div className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">{roundTimer}s</div>
              <div className="text-6xl font-black bg-white/10 px-12 py-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl tracking-widest">{question}</div>
            </>
          )}
          {status === 'result' && (
            <div className="flex flex-col gap-6 text-center">
              <div className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">
                {p1.hp === 0 && p2.hp === 0 ? 'DRAW!' : p1.hp === 0 ? `${p2Name.toUpperCase()} WINS!` : `${p1Name.toUpperCase()} WINS!`}
              </div>
              <button onClick={() => window.location.reload()} className="bg-gradient-to-r from-rose-500 to-orange-500 px-8 py-3 text-xl font-bold rounded-full uppercase">Leave Match</button>
            </div>
          )}
        </div>

        <div className="w-[300px] text-right">
          <div className="w-full h-6 bg-white/10 rounded-full border-2 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden scale-x-[-1]">
            <div className={`h-full transition-all duration-300 ease-out ${getHpColor(p2.hp)}`} style={{ width: `${p2.hp}%` }}></div>
          </div>
          <div className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">{p2Name} - HP: {p2.hp}</div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex-1 flex justify-between items-end px-[10%] relative border-b-2 border-white/10 bg-gradient-to-t from-white/5 to-transparent z-0 min-h-[30vh]">
        {/* P1 */}
        <div className="relative w-[250px] h-[250px] flex justify-center items-end">
          {p1.feedback && <div className="absolute -top-10 bg-white text-black px-4 py-2 rounded-2xl font-bold text-lg shadow-xl animate-bounce">{p1.feedback}</div>}
          <img src={getAnimSrc(1, p1.anim)} alt="P1" className={`max-w-full max-h-full object-contain transition-all ${p1.anim === 'hit' ? 'sepia hue-rotate-[-50deg] saturate-[5] brightness-75 -translate-x-2' : ''}`} />
        </div>
        
        {/* Projectiles */}
        <div className="absolute top-1/2 left-[20%] right-[20%] h-[100px] -translate-y-1/2 pointer-events-none">
          {projectile === 'p1-to-p2' && <img src={fireballEast.src} alt="Attack" className="absolute h-[100px] left-0 animate-[flyRight_0.5s_linear_forwards]" />}
          {projectile === 'p2-to-p1' && <img src={fireballWest.src} alt="Attack" className="absolute h-[100px] right-0 animate-[flyLeft_0.5s_linear_forwards]" />}
        </div>

        {/* P2 */}
        <div className="relative w-[250px] h-[250px] flex justify-center items-end">
          {p2.feedback && <div className="absolute -top-10 bg-white text-black px-4 py-2 rounded-2xl font-bold text-lg shadow-xl animate-bounce">{p2.feedback}</div>}
          <img src={getAnimSrc(2, p2.anim)} alt="P2" className={`max-w-full max-h-full object-contain transition-all ${p2.anim === 'hit' ? 'sepia hue-rotate-[-50deg] saturate-[5] brightness-75 translate-x-2' : ''}`} />
        </div>
      </div>

      {/* SINGLE Calculator (For Local Player Only) */}
      <div className="flex justify-center items-center px-12 py-10 bg-black/30 border-t border-white/10 shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="w-[400px] bg-white/5 rounded-3xl p-6 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col mb-4">
          <div className="flex justify-between items-end mb-4">
            <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest border border-emerald-500/30">
              YOU ARE {localPlayerId === 1 ? 'PLAYER A' : 'PLAYER B'}
            </div>
            <div className="bg-black/50 h-[60px] flex-1 ml-4 rounded-xl flex items-center justify-end px-4 text-3xl font-mono font-bold border border-white/5 shadow-inner text-white">
              {localState.input || '0'}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {renderCalcButton('7', '7', () => handleInput('7'))}
            {renderCalcButton('8', '8', () => handleInput('8'))}
            {renderCalcButton('9', '9', () => handleInput('9'))}
            {renderCalcButton('DEL', 'BSP', () => handleInput('backspace'), false, true)}

            {renderCalcButton('4', '4', () => handleInput('4'))}
            {renderCalcButton('5', '5', () => handleInput('5'))}
            {renderCalcButton('6', '6', () => handleInput('6'))}
            {renderCalcButton('CLR', 'C', () => handleInput('clear'), true)}

            {renderCalcButton('1', '1', () => handleInput('1'))}
            {renderCalcButton('2', '2', () => handleInput('2'))}
            {renderCalcButton('3', '3', () => handleInput('3'))}
            <div className="row-span-2 flex">
              <button onClick={submitAnswer} className="w-full relative flex flex-col items-center justify-center bg-gradient-to-tr from-rose-500 to-orange-500 text-white rounded-xl shadow-[0_5px_15px_rgba(244,63,94,0.4)] hover:opacity-90 active:scale-95 transition-all">
                <span className="text-xl font-black tracking-wider">ATK</span>
                <span className="absolute bottom-2 right-3 text-[10px] font-mono opacity-60">ENT</span>
              </button>
            </div>

            {renderCalcButton('0', '0', () => handleInput('0'), false, false, "col-span-3 w-full")}
          </div>
        </div>
      </div>
    </div>
  );
}
