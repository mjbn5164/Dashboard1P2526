
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LabelList, PieChart, Pie, Cell as PieCell
} from 'recharts';
import { 
  Home, Table as TableIcon, BookOpen, LayoutDashboard, Users, TrendingUp,
  Trophy, Star, CheckCircle, Zap, Orbit, LogOut, Layers, Loader2, Maximize,
  X, Baby, School, Library, Atom, GraduationCap
} from 'lucide-react';
import { StudentData, SubjectStats, SheetInfo } from './types';
import { connectSpreadsheetAction, loadAndAnalyzeSheetAction } from './actions';

const formatDecimal = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return String(val);
  return num.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
};

export default function DashboardPage() {
  const [sheetId, setSheetId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);
  const [data, setData] = useState<StudentData[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'subjects' | 'table'>('home');

  useEffect(() => {
    const saved = localStorage.getItem('google_sheet_id');
    if (saved) setSheetId(saved);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const sheets = await connectSpreadsheetAction(sheetId);
      setAvailableSheets(sheets);
      localStorage.setItem('google_sheet_id', sheetId);
      setIsConnected(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSheet = async (name: string) => {
    setLoading(true);
    setSelectedSheet(name);
    try {
      const result = await loadAndAnalyzeSheetAction(sheetId, name);
      setActiveSubjects(result.subjects);
      setData(result.students);
      setActiveTab('overview');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isQualitative = useMemo(() => 
    selectedSheet.toLowerCase().startsWith('pré_') || /^(1|2|3|4)\.?º/i.test(selectedSheet), 
  [selectedSheet]);

  const stats = useMemo(() => {
    return activeSubjects.map(subject => {
      const grades = data.map(s => s.grades[subject]).filter(v => v > 0);
      const count = grades.length;
      const isPre = selectedSheet.toLowerCase().startsWith('pré_');
      const negatives = grades.filter(g => isPre ? g === 1 : (isQualitative ? g <= 2 : g < 10)).length;
      const percNeg = count > 0 ? Number(((negatives / count) * 100).toFixed(1)) : 0;
      const percPos = isQualitative ? Number((100 - percNeg).toFixed(1)) : (count > 0 ? Number(((count - negatives) / count * 100).toFixed(1)) : 0);

      return { 
        subject, avg: count > 0 ? grades.reduce((a,b)=>a+b,0)/count : 0, 
        percentageBelowTen: percNeg, percentagePositive: percPos, count, countBelowTen: negatives,
        distribution: [{ range: 'Neg', value: negatives, color: '#ef4444' }, { range: 'Pos', value: count-negatives, color: '#22c55e' }]
      };
    }) as SubjectStats[];
  }, [data, activeSubjects, isQualitative, selectedSheet]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-panel max-w-lg w-full p-10 rounded-[40px] border-2 border-emerald-500/30 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <Orbit className="text-emerald-500 mb-6" size={60} />
            <h1 className="text-4xl font-orbitron font-bold text-white uppercase text-center">Nexus Link</h1>
            <p className="font-bold uppercase tracking-widest text-[16px] mt-2 text-center leading-relaxed">
              <span className="neon-text-cyan">Agrupamento de Escolas de</span> <br/>
              <span className="neon-text-redondo-magenta">Redondo</span>
            </p>
          </div>
          <div className="space-y-6">
            <input 
              type="text" 
              placeholder="Introduzir Google Sheet ID..." 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 focus:border-emerald-500 outline-none text-white font-mono"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
            />
            <button onClick={handleConnect} className="w-full py-5 bg-emerald-500 text-white font-orbitron font-black uppercase rounded-2xl shadow-lg hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><Zap size={18}/> Ligar Sistema</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="w-20 md:w-64 glass-panel border-r border-slate-800 flex flex-col items-center py-8 shrink-0">
        <div className="mb-12 flex flex-col items-center">
          <Orbit className="text-cyan-400 mb-2 animate-pulse" size={32} />
          <span className="font-orbitron font-bold text-xs neon-text-magenta block">EduStats</span>
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full px-4">
          {[
            { id: 'home', icon: <Home size={24} />, label: 'Início', color: 'emerald' },
            { id: 'table', icon: <TableIcon size={24} />, label: 'Listagem', color: 'cyan' },
            { id: 'overview', icon: <LayoutDashboard size={24} />, label: 'Dashboard', color: 'pink' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === item.id ? `bg-${item.color}-500/20 text-${item.color}-400 shadow-lg` : 'text-slate-400 hover:text-white'}`}>
              {item.icon}
              <span className="hidden md:block font-bold text-[14px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => setIsConnected(false)} className="mt-auto p-4 text-red-400 font-bold uppercase text-[10px] hover:bg-red-500/10 rounded-xl transition-colors">Sair</button>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <Loader2 className="animate-spin text-cyan-400" size={48} />
          </div>
        )}

        <header className="mb-10 flex items-center gap-6">
          <div className="bg-white p-2 rounded-2xl h-24 flex items-center justify-center shrink-0 shadow-white/10 shadow-lg">
            <img src="/logo-aer.png" alt="AER" className="h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-orbitron font-bold neon-text-cyan uppercase">
              Agrupamento de Escolas de <span className="neon-text-redondo-magenta">Redondo</span> 
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">2025/26 | Análise em Tempo Real</p>
          </div>
        </header>

        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {availableSheets.map((s) => (
              <button key={s.id} onClick={() => handleLoadSheet(s.name)} className="glass-panel p-8 rounded-[30px] text-[18px] font-bold text-white uppercase border-l-4 border-cyan-500 hover:scale-105 transition-all text-left shadow-xl">
                {s.name}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'overview' && data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in zoom-in-95">
            <StatCard title="Total Alunos" value={data.length} color="cyan" icon={<Users />} />
            <StatCard title="Sucesso Global" value={stats.length ? stats.reduce((a,b)=>a+b.percentagePositive,0)/stats.length : 0} unit="%" color="emerald" icon={<CheckCircle />} />
            <StatCard title="Média Mais Alta" value={Math.max(...stats.map(s=>s.avg))} color="purple" icon={<Trophy />} />
            <StatCard title="Disciplinas" value={activeSubjects.length} color="pink" icon={<BookOpen />} />
          </div>
        )}

        {activeTab === 'table' && data.length > 0 && (
          <div className="glass-panel rounded-[40px] overflow-hidden shadow-2xl border border-slate-800 animate-in slide-in-from-right-4">
            <div className="overflow-x-auto p-6">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-widest text-[10px] font-black">
                    <th className="px-6 py-2">Nº</th>
                    <th className="px-6 py-2">Aluno</th>
                    {activeSubjects.map((s, i) => <th key={i} className="px-6 py-2 text-center">{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((student) => (
                    <tr key={student.numero} className="bg-slate-900/30 hover:bg-cyan-500/10 transition-all rounded-2xl group">
                      <td className="px-6 py-4 text-cyan-400 font-bold rounded-l-2xl">{student.numero}</td>
                      <td className="px-6 py-4 font-semibold text-slate-300">{student.aluno}</td>
                      {activeSubjects.map((subj, idx) => {
                        const val = student.grades[subj] || 0;
                        const isPos = isQualitative ? (selectedSheet.startsWith('pré_') ? val >= 2 : val >= 3) : val >= 10;
                        return (
                          <td key={idx} className={`px-6 py-4 text-center font-bold grade-glow ${val > 0 ? (isPos ? 'text-[#22c55e]' : 'text-[#ef4444]') : 'text-slate-700'}`}>
                            {val > 0 ? val : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, color, icon, unit = "" }: any) {
  return (
    <div className={`glass-panel p-6 rounded-3xl border-l-4 border-${color}-500 shadow-xl`}>
      <div className="flex items-center gap-3 mb-2 opacity-50">
        <span className={`text-${color}-400`}>{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <h3 className={`text-4xl font-orbitron font-black neon-text-${color}`}>
        {typeof value === 'number' ? formatDecimal(value) : value}{unit}
      </h3>
    </div>
  );
}
