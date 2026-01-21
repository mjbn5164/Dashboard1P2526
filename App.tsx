
import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList, PieChart, Pie, Cell as PieCell
} from 'recharts';
import {
  Home,
  Table as TableIcon,
  BookOpen,
  LayoutDashboard,
  Users,
  TrendingUp,
  Trophy,
  Star,
  CheckCircle,
  Zap,
  Orbit,
  LogOut,
  Layers,
  Loader2,
  Maximize,
  X,
  Baby,
  School,
  Library,
  Atom,
  GraduationCap
} from 'lucide-react';
import { StudentData, SubjectStats, GradeDistribution, SheetInfo } from './types';
import { extractDataFromSheetsText } from './services/geminiService';

const MASTER_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const formatDecimal = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return String(val);
  return num.toLocaleString('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
};

const interpolateColor = (color1: string, color2: string, factor: number) => {
  const result = color1.slice(1).match(/.{2}/g)!.map((hex, i) => {
    const v1 = parseInt(hex, 16);
    const v2 = parseInt(color2.slice(1).match(/.{2}/g)![i], 16);
    const val = Math.round(v1 + (v2 - v1) * factor);
    return val.toString(16).padStart(2, '0');
  });
  return `#${result.join('')}`;
};

const getGaugeColor = (value: number, max: number) => {
  const threshold = max > 5 ? 10 : 3;

  if (value < threshold) {
    // 0 to threshold: Red to Orange
    const factor = value / threshold;
    return interpolateColor('#ef4444', '#f97316', factor);
  } else {
    // threshold to max: Orange to Yellow to Green
    // Split the positive range into two halves
    const range = max - threshold;
    const midpoint = threshold + (range / 2);

    if (value < midpoint) {
      // threshold to midpoint: Orange to Yellow
      // Normalize value within this sub-range to 0-1
      const factor = (value - threshold) / (midpoint - threshold);
      return interpolateColor('#f97316', '#eab308', factor);
    } else {
      // midpoint to max: Yellow to Green
      // Normalize value within this sub-range to 0-1
      const factor = (value - midpoint) / (max - midpoint);
      return interpolateColor('#eab308', '#22c55e', factor);
    }
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const dataKey = payload[0].dataKey;
    const name = data.subject || data.range || data.name || data.subjectName;
    const unit = dataKey === 'percentageBelowTen' || dataKey === 'percentagePositive' ? '%' : '';
    const color = payload[0].color || data.color || '#f43f5e';

    return (
      <div className="glass-panel p-4 border-2 border-white/20 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] min-w-[140px]">
        <p className="text-[12px] font-black uppercase tracking-widest mb-1" style={{ color }}>{name}</p>
        <p className="text-white text-lg font-mono font-bold">
          {formatDecimal(Math.abs(value))}{unit}
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarLabel = (props: any) => {
  const { x, y, width, height, payload, fontSize, valueKey } = props;
  const value = payload?.[valueKey || 'count'];
  if (value === undefined || value === 0) return null;

  const isNegative = payload.chartValue < 0;
  const labelY = isNegative ? y + height + 20 : y - 12;
  const displayValue = Math.abs(value);
  const suffix = valueKey === 'percentageBelowTen' ? '%' : '';

  return (
    <text
      x={x + width / 2}
      y={labelY}
      fill="#FFFFFF"
      textAnchor="middle"
      fontSize={fontSize || 12}
      fontWeight="900"
      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
    >
      {formatDecimal(displayValue)}{suffix}
    </text>
  );
};

const SubjectCardContent: React.FC<{ s: SubjectStats, isFocused?: boolean, onExpand?: () => void, isQualitative: boolean }> = ({ s, isFocused, onExpand, isQualitative }) => (
  <div className={`flex flex-col h-full transition-all duration-500 relative`}>
    {!isFocused && (
      <button
        onClick={(e) => { e.stopPropagation(); onExpand?.(); }}
        className="absolute top-1 right-1 p-2 bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-all z-10"
      >
        <Maximize size={16} />
      </button>
    )}

    <div className={`flex justify-between items-start mb-6 ${!isFocused ? 'pr-12' : ''}`}>
      <h4 className={`font-bold font-orbitron text-white uppercase tracking-tight transition-all duration-500 ${isFocused ? 'neon-text-cyan text-5xl' : 'text-xl'}`}>{s.subject}</h4>
    </div>

    <div className={`grid ${isFocused ? (isQualitative ? 'grid-cols-2' : 'grid-cols-3') + ' gap-12' : 'grid-cols-1 gap-3'} mb-8 transition-all duration-500`}>
      {!isQualitative ? (
        <>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className={`text-slate-500 uppercase font-bold tracking-widest ${isFocused ? 'text-[20px] text-slate-300' : 'text-[10px]'}`}>Média</span>
            <span className={`text-cyan-400 font-mono font-bold ${isFocused ? 'text-[40px]' : ''}`}>{formatDecimal(s.avg)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className={`text-slate-500 uppercase font-bold tracking-widest ${isFocused ? 'text-[20px] text-slate-300' : 'text-[10px]'}`}>Desvio Padrão</span>
            <span className={`text-purple-400 font-mono font-bold ${isFocused ? 'text-[40px]' : ''}`}>{formatDecimal(s.stdDev)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className={`text-slate-500 uppercase font-bold tracking-widest ${isFocused ? 'text-[20px] text-slate-300' : 'text-[10px]'}`}>% Positivas</span>
            <span className={`text-emerald-400 font-mono font-bold ${isFocused ? 'text-[40px]' : ''}`}>{formatDecimal(s.percentagePositive)}%</span>
          </div>
        </>
      )}
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <span className={`text-slate-500 uppercase font-bold tracking-widest ${isFocused ? 'text-[20px] text-slate-300' : 'text-[10px]'}`}>% Negativas</span>
        <span className={`text-red-400 font-mono font-bold ${isFocused ? 'text-[40px]' : ''}`}>{formatDecimal(s.percentageBelowTen)}%</span>
      </div>
    </div>

    <div className={`${isFocused ? 'h-[400px]' : 'h-60'} w-full mt-auto relative`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={s.distribution} margin={{ top: 35, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: isFocused ? 20 : 10 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar dataKey="chartValue" radius={[4, 4, 4, 4]}>
            <LabelList content={<CustomBarLabel fontSize={isFocused ? 20 : 12} valueKey="count" />} />
            {s.distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const App: React.FC = () => {
  const [sheetId, setSheetId] = useState<string>(localStorage.getItem('google_sheet_id') || '');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);
  const [data, setData] = useState<StudentData[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'subjects' | 'table'>('home');
  const [hoveredSubject, setHoveredSubject] = useState<number | null>(null);
  const [maximizedDashboardChart, setMaximizedDashboardChart] = useState<'success-failure' | 'top-negative' | 'lowest-avg-gauge' | 'highest-stddev-gauge' | null>(null);

  useEffect(() => {
    if (sheetId && sheetId.trim() !== "") {
      handleConnect();
    }
  }, []);

  const handleConnect = async () => {
    if (!sheetId || sheetId.trim() === "") return;
    setLoading(true);
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${MASTER_API_KEY}`);
      if (!response.ok) throw new Error("Não foi possível aceder à folha.");
      const metadata = await response.json();
      const sheets = metadata.sheets.map((s: any) => ({ name: s.properties.title, id: s.properties.sheetId }));
      setAvailableSheets(sheets);
      localStorage.setItem('google_sheet_id', sheetId);
      setIsConnected(true);
    } catch (err) {
      alert("ERRO: Verifique o ID da Folha de Cálculo.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSheet = async (sheetName: string) => {
    setLoading(true);
    setSelectedSheet(sheetName);
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${sheetName}'?key=${MASTER_API_KEY}`);
      const result = await response.json();
      const rows = result.values;
      if (rows && rows.length > 0) {
        const textData = rows.map((r: any) => r.join(', ')).join('\n');
        const extracted = await extractDataFromSheetsText(textData, MASTER_API_KEY);
        setActiveSubjects(extracted.subjects);
        setData(extracted.students);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.includes('Quota') || err.toString().includes('429')) {
        alert("⚠️ Limite de utilização da IA atingido. Por favor aguarde um momento ou tente amanhã.");
      } else {
        alert(`Erro ao ler dados da aba: ${err.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
      setActiveTab('table');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_sheet_id');
    setSheetId('');
    setIsConnected(false);
    setData([]);
    setActiveTab('home');
  };

  const isPreSchool = useMemo(() => selectedSheet.toLowerCase().startsWith('pré_'), [selectedSheet]);
  const isFirstCycle = useMemo(() => /^(1|2|3|4)\.?º\s?Ano/i.test(selectedSheet), [selectedSheet]);
  const isSecondThirdCycle = useMemo(() => /^(5|6|7|8|9)\.?º\s?Ano/i.test(selectedSheet), [selectedSheet]);
  const isSecundario = useMemo(() => /^(10|11|12)\.?º\s?Ano/i.test(selectedSheet), [selectedSheet]);

  const isQualitative = useMemo(() => isPreSchool || isFirstCycle, [isPreSchool, isFirstCycle]);

  const positiveThreshold = useMemo(() => {
    if (isPreSchool) return 2;
    if (isFirstCycle || isSecondThirdCycle) return 3;
    return 10;
  }, [isPreSchool, isFirstCycle, isSecondThirdCycle]);

  const maxGradeValue = useMemo(() => {
    if (isPreSchool) return 3;
    if (isFirstCycle || isSecondThirdCycle) return 5;
    return 20;
  }, [isPreSchool, isFirstCycle, isSecondThirdCycle]);

  const formatGradeForTable = (grade: number): string => {
    if (grade === 0) return '-';
    if (isPreSchool) {
      if (grade === 1) return 'Não Adquirido';
      if (grade === 2) return 'Em Aquisição';
      if (grade >= 3) return 'Adquirido';
    }
    if (isFirstCycle) {
      if (grade <= 2) return 'Insuficiente';
      if (grade === 3) return 'Suficiente';
      if (grade === 4) return 'Bom';
      if (grade >= 5) return 'Muito Bom';
    }
    return String(grade);
  };

  const getCellColorClass = (grade: number): string => {
    if (grade === 0) return 'text-slate-600 opacity-30';
    if (isPreSchool) {
      if (grade === 1) return 'text-[#ef4444]'; // Vermelho puro
      if (grade === 2) return 'text-yellow-400';
      if (grade >= 3) return 'text-[#22c55e]'; // Verde puro
    }
    if (isFirstCycle) {
      return grade <= 2 ? 'text-[#ef4444]' : 'text-[#22c55e]';
    }
    const isPositive = grade >= positiveThreshold;
    return isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]';
  };

  const stats = useMemo(() => {
    return activeSubjects.map(subject => {
      const grades = data.map(s => s.grades[subject]).filter(v => v !== undefined && v > 0);
      const count = grades.length;
      const avg = count > 0 ? grades.reduce((a, b) => a + b, 0) / count : 0;
      const variance = count > 0 ? grades.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / count : 0;

      let countBelowThreshold = 0;
      if (isPreSchool) {
        countBelowThreshold = grades.filter(g => g === 1).length;
      } else if (isFirstCycle) {
        countBelowThreshold = grades.filter(g => g <= 2).length;
      } else {
        countBelowThreshold = grades.filter(g => g < positiveThreshold).length;
      }
      const countAboveThreshold = count - countBelowThreshold;

      let distribution: GradeDistribution[];
      if (isPreSchool) {
        distribution = [
          { range: 'Não Adq.', count: grades.filter(g => g === 1).length, chartValue: -grades.filter(g => g === 1).length, color: '#f43f5e' },
          { range: 'Em Aq.', count: grades.filter(g => g === 2).length, chartValue: grades.filter(g => g === 2).length, color: '#f59e0b' },
          { range: 'Adquirido', count: grades.filter(g => g >= 3).length, chartValue: grades.filter(g => g >= 3).length, color: '#10b981' },
        ];
      } else if (isFirstCycle || isSecondThirdCycle) {
        distribution = [
          { range: isFirstCycle ? 'Insuf.' : '1-2', count: grades.filter(g => g <= 2).length, chartValue: -grades.filter(g => g <= 2).length, color: '#f43f5e' },
          { range: isFirstCycle ? 'Suf.' : '3', count: grades.filter(g => g === 3).length, chartValue: grades.filter(g => g === 3).length, color: '#10b981' },
          { range: isFirstCycle ? 'Bom' : '4', count: grades.filter(g => g === 4).length, chartValue: grades.filter(g => g === 4).length, color: '#22d3ee' },
          { range: isFirstCycle ? 'M.Bom' : '5', count: grades.filter(g => g === 5).length, chartValue: grades.filter(g => g === 5).length, color: '#d946ef' },
        ];
      } else {
        distribution = [
          { range: '< 10', count: countBelowThreshold, chartValue: -countBelowThreshold, color: '#f43f5e' },
          { range: '10-13', count: grades.filter(g => g >= 10 && g <= 13).length, chartValue: grades.filter(g => g >= 10 && g <= 13).length, color: '#f59e0b' },
          { range: '14-17', count: grades.filter(g => g >= 14 && g <= 17).length, chartValue: grades.filter(g => g >= 14 && g <= 17).length, color: '#22d3ee' },
          { range: '18-20', count: grades.filter(g => g >= 18).length, chartValue: grades.filter(g => g >= 18).length, color: '#d946ef' },
        ];
      }

      const rawPercNeg = count > 0 ? (countBelowThreshold / count) * 100 : 0;
      const percNeg = Number(rawPercNeg.toFixed(1));
      let percPos = count > 0 ? Number(((countAboveThreshold / count) * 100).toFixed(1)) : 0;

      if (isQualitative) {
        percPos = Number((100 - percNeg).toFixed(1));
      }

      return {
        subject,
        avg: Number(avg.toFixed(1)),
        stdDev: Number(Math.sqrt(variance).toFixed(1)),
        max: count > 0 ? Math.max(...grades) : 0,
        min: count > 0 ? Math.min(...grades) : 0,
        count,
        countBelowTen: countBelowThreshold,
        percentageBelowTen: percNeg,
        percentagePositive: percPos,
        distribution,
        allGrades: grades
      };
    }) as SubjectStats[];
  }, [data, activeSubjects, positiveThreshold, isPreSchool, isFirstCycle, isSecondThirdCycle, isQualitative]);

  const topStudentByMaxGrades = useMemo(() => {
    if (!data.length || !activeSubjects.length) return null;
    const studentCounts = data.map(s => {
      const maxCount = activeSubjects.reduce((acc, sub) => acc + (s.grades[sub] >= maxGradeValue ? 1 : 0), 0);
      return { name: s.aluno, count: maxCount };
    });
    return studentCounts.sort((a, b) => b.count - a.count)[0];
  }, [data, activeSubjects, maxGradeValue]);

  const topSubjectByMaxGrades = useMemo(() => {
    if (!stats.length) return null;
    const subjectMaxCounts = stats.map(s => {
      const count = s.allGrades.filter(g => g >= maxGradeValue).length;
      return { subject: s.subject, count };
    });
    return subjectMaxCounts.sort((a, b) => b.count - a.count)[0];
  }, [stats, maxGradeValue]);

  const bestSubject = useMemo(() => stats.filter(s => s.count > 0).sort((a, b) => b.avg - a.avg)[0] || null, [stats]);
  const lowestAvgSubject = useMemo(() => stats.filter(s => s.count > 0).sort((a, b) => a.avg - b.avg)[0] || null, [stats]);
  const highestStdDevSubject = useMemo(() => stats.filter(s => s.count > 0).sort((a, b) => b.stdDev - a.stdDev)[0] || null, [stats]);

  const bestStudent = useMemo(() => {
    if (!data.length || !activeSubjects.length) return null;
    const studentAvgs = data.map(s => {
      const grades = activeSubjects.map(sub => s.grades[sub]).filter(g => g > 0);
      return { name: s.aluno, avg: grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0 };
    }).filter(s => s.avg > 0);
    return studentAvgs.sort((a, b) => b.avg - a.avg)[0];
  }, [data, activeSubjects]);

  const globalSuccessRate = useMemo(() => {
    const totalPositives = stats.reduce((acc, s) => acc + (s.count - s.countBelowTen), 0);
    const totalEvaluations = stats.reduce((acc, s) => acc + s.count, 0);
    return totalEvaluations > 0 ? (totalPositives / totalEvaluations) * 100 : 0;
  }, [stats]);

  const balanceData = useMemo(() => stats.map(s => ({ subject: s.subject, positives: s.count - s.countBelowTen, negatives: s.countBelowTen })), [stats]);

  const topNegativeSubjects = useMemo(() => {
    return [...stats]
      .filter(s => s.count > 0)
      .sort((a, b) => b.percentageBelowTen - a.percentageBelowTen)
      .slice(0, 3)
      .map((s, idx) => ({ ...s, color: ['#D32F2F', '#EC407A', '#F48FB1'][idx] }));
  }, [stats]);

  const renderSuccessFailureChart = (isMaximized = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={balanceData} margin={{ left: isMaximized ? 80 : 10, right: 30, top: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="subject"
          type="category"
          tick={{ fill: '#ffffff', fontSize: isMaximized ? 14 : 14.5, fontWeight: 'bold' }}
          width={isMaximized ? 120 : 80}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="positives" stackId="a" fill="#10b981">
          <LabelList dataKey="positives" position="center" fill="#fff" fontSize={isMaximized ? 24 : 16} fontWeight="900" formatter={(val: number) => val === 0 ? '' : val} />
        </Bar>
        <Bar dataKey="negatives" stackId="a" fill="#f43f5e">
          <LabelList dataKey="negatives" position="center" fill="#fff" fontSize={isMaximized ? 24 : 16} fontWeight="900" formatter={(val: number) => val === 0 ? '' : val} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderTopNegativeChart = (isMaximized = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={topNegativeSubjects} margin={{ top: isMaximized ? 60 : 35, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
        <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#ffffff', fontSize: isMaximized ? 24 : 16, fontWeight: 'bold' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff', fontSize: isMaximized ? 18 : 14, fontWeight: 'bold' }} unit="%" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="percentageBelowTen" radius={[10, 10, 0, 0]}>
          <LabelList content={<CustomBarLabel fontSize={isMaximized ? 24 : 16} valueKey="percentageBelowTen" />} />
          {topNegativeSubjects.map((entry, index) => (
            <Cell key={`cell-neg-${index}`} fill={entry.color} className="drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderGauge = (value: number, max: number, color: string, label: string, isMaximized = false, useGradient = false) => {
    const gaugeData = [{ name: 'Value', value: value, color: color }, { name: 'Remaining', value: Math.max(0, max - value), color: 'rgba(255,255,255,0.05)' }];
    return (
      <div className="flex flex-col items-center justify-center h-full relative">
        <div className={`w-full ${isMaximized ? 'h-full' : 'h-40'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {useGradient && (
                <defs>
                  <linearGradient id="gaugeTargetGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              )}
              <Pie data={gaugeData} cx="50%" cy="70%" startAngle={180} endAngle={0} innerRadius={isMaximized ? "60%" : "50%"} outerRadius={isMaximized ? "90%" : "80%"} paddingAngle={0} dataKey="value" stroke="none">
                {gaugeData.map((entry, index) => <PieCell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={`absolute bottom-[20%] text-center`}>
          <div className={`font-orbitron font-black ${isMaximized ? 'text-5xl mb-2' : 'text-lg'}`} style={{ color }}>{formatDecimal(value)}</div>
          <div className={`font-bold uppercase tracking-widest text-slate-400 ${isMaximized ? 'text-lg' : 'text-[8px]'}`}>{label}</div>
        </div>
      </div>
    );
  };

  const groupedSheets = useMemo(() => {
    return {
      preEscolar: availableSheets.filter(s => s.name.toLowerCase().startsWith('pré_')),
      primeiroCiclo: availableSheets.filter(s => /^(1|2|3|4)\.?º\s?Ano/i.test(s.name)),
      segundoCiclo: availableSheets.filter(s => /^(5|6)\.?º\s?Ano/i.test(s.name)),
      terceiroCiclo: availableSheets.filter(s => /^(7|8|9)\.?º\s?Ano/i.test(s.name)),
      secundario: availableSheets.filter(s => /^(10|11|12)\.?º\s?Ano/i.test(s.name)),
    };
  }, [availableSheets]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6">
        <div className="glass-panel max-w-lg w-full p-10 rounded-[40px] border-2 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
          <div className="flex flex-col items-center mb-10">
            <div className="w-auto max-w-sm bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-8 p-6">
              <img src="/logo-aer.png" alt="Logótipo AER" className="h-28 w-auto object-contain" style={{ clipPath: 'inset(4% 0 0 0)' }} />
            </div>
            <h1 className="text-4xl font-bold text-white uppercase tracking-tighter text-center">Nexus Link</h1>
            <p className="font-bold uppercase tracking-widest text-[16px] mt-2 text-center">
              <span className="neon-text-cyan">Agrupamento de Escolas de</span> <span className="neon-text-redondo-magenta">Redondo</span>
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">ID da Folha de Cálculo</label>
              <input type="text" placeholder="Introduzir Google Sheet ID..." className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm text-white" value={sheetId} onChange={(e) => setSheetId(e.target.value)} />
            </div>
            <button onClick={handleConnect} disabled={loading || !sheetId} className="w-full py-5 bg-emerald-500 text-white font-orbitron font-black uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : <><Zap /> Ligar Sistema</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent text-slate-200 relative">
      <aside className="w-20 md:w-64 glass-panel border-r border-slate-800 flex flex-col items-center py-8 z-30 shrink-0">
        <div className="mb-12 w-full px-4 text-center">
          <div className="flex flex-col items-center mb-2">
            <Orbit className="text-cyan-400 mb-2 animate-pulse" size={32} />
            <span className="font-orbitron font-bold text-sm neon-text-magenta block">EduStats Nexus</span>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-6 w-full px-4">
          {[
            { id: 'home', icon: <Home size={24} />, label: 'Início', color: 'emerald' },
            { id: 'table', icon: <TableIcon size={24} />, label: 'Listagem', color: 'cyan' },
            { id: 'subjects', icon: <BookOpen size={24} />, label: 'Disciplinas', color: 'purple' },
            { id: 'overview', icon: <LayoutDashboard size={24} />, label: 'Dashboard', color: 'pink' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 transform hover:-translate-y-2 hover:translate-x-2 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] ${activeTab === item.id ? `bg-${item.color}-500/20 text-${item.color}-400 shadow-lg` : 'text-slate-400 hover:text-white'}`}>
              {item.icon}
              <span className="hidden md:block font-bold text-[14px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto px-4 w-full">
          <button onClick={handleDisconnect} className="w-full p-3 glass-panel rounded-xl text-red-400 hover:bg-red-500/10 flex items-center justify-center gap-2 transition-all hover:scale-105">
            <LogOut size={16} /> <span className="hidden md:block text-[10px] font-bold uppercase">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative">
        <header className="mb-10 flex items-center gap-6">
          <div className="bg-white p-2 rounded-2xl h-20 md:h-24 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <img src="/logo-aer.png" alt="Logótipo AER" className="h-full object-contain" style={{ clipPath: 'inset(4% 0 0 0)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-orbitron font-bold neon-text-cyan uppercase leading-tight">
              Agrupamento de Escolas de <span className="neon-text-redondo-magenta">Redondo</span>
              <div className="text-white text-base mt-1 block">2025/ 26 | 1.º Período</div>
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Análise de Dados Google Cloud | {selectedSheet || 'Nenhuma folha selecionada'}</p>
          </div>
        </header>

        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl">
            <Loader2 className="animate-spin text-cyan-500 mb-4" size={64} />
            <p className="text-cyan-400 font-orbitron tracking-widest animate-pulse">SINCRONIZANDO...</p>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <h2 className="text-2xl font-orbitron font-bold text-white uppercase tracking-tighter flex items-center gap-4">
              <Layers className="text-cyan-400" /> Turmas Detetadas por Ciclo
            </h2>
            <div className="flex flex-col gap-6">
              <CycleBox title="Pré-escolar" icon={<Baby size={24} />} color="pink" sheets={groupedSheets.preEscolar} selectedSheet={selectedSheet} onSelect={handleLoadSheet} />
              <CycleBox title="1.º Ciclo" icon={<School size={24} />} color="emerald" sheets={groupedSheets.primeiroCiclo} selectedSheet={selectedSheet} onSelect={handleLoadSheet} />
              <CycleBox title="2.º Ciclo" icon={<Library size={24} />} color="cyan" sheets={groupedSheets.segundoCiclo} selectedSheet={selectedSheet} onSelect={handleLoadSheet} />
              <CycleBox title="3.º Ciclo" icon={<Atom size={24} />} color="purple" sheets={groupedSheets.terceiroCiclo} selectedSheet={selectedSheet} onSelect={handleLoadSheet} />
              <CycleBox title="Secundário" icon={<GraduationCap size={24} />} color="yellow" sheets={groupedSheets.secundario} selectedSheet={selectedSheet} onSelect={handleLoadSheet} />
            </div>
          </div>
        )}

        {activeTab === 'overview' && data.length > 0 && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Total de Alunos" value={data.length} icon={<Users />} color="cyan" />

              {isQualitative ? (
                <>
                  <StatCard title="Taxa de Sucesso Global" value={globalSuccessRate} icon={<CheckCircle />} color="purple" unit="%" />
                  <StatCard
                    title="Aluno com maior n.º de Classificações Máximas"
                    value={topStudentByMaxGrades?.count || 0}
                    subtitle={topStudentByMaxGrades?.name || "N/A"}
                    icon={<Trophy />}
                    color="emerald"
                  />
                  <StatCard
                    title="Disciplina com maior n.º de classificações máximas"
                    value={topSubjectByMaxGrades?.count || 0}
                    subtitle={topSubjectByMaxGrades?.subject || "N/A"}
                    icon={<Star />}
                    color="orange"
                  />
                </>
              ) : (
                <>
                  <StatCard title="Média Global" value={stats.filter(s => s.count > 0).reduce((a, b) => a + b.avg, 0) / (stats.filter(s => s.count > 0).length || 1)} icon={<TrendingUp />} color="purple" />
                  <StatCard title="Aluno com Média Mais Alta" value={bestStudent?.avg || 0} subtitle={bestStudent?.name || "N/A"} icon={<Trophy />} color="emerald" />
                  <StatCard title="Disciplina Com Média Mais Alta" value={bestSubject?.avg || 0} subtitle={bestSubject?.subject || "N/A"} icon={<Star />} color="orange" />
                </>
              )}
            </div>
            <div className="flex flex-col lg:flex-row gap-4 lg:justify-center items-start w-full">
              <div className={`w-full ${isQualitative ? 'lg:w-1/2' : 'lg:w-[35%]'} glass-panel p-6 rounded-3xl relative overflow-hidden h-[450px] shadow-2xl !border-2 !border-emerald-500`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-orbitron font-bold uppercase text-white">Sucesso/Insucesso</h2>
                  <button onClick={() => setMaximizedDashboardChart('success-failure')} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"><Maximize size={16} /></button>
                </div>
                {renderSuccessFailureChart()}
              </div>
              <div className={`w-full ${isQualitative ? 'lg:w-1/2' : 'lg:w-[40%]'} glass-panel p-6 rounded-3xl h-[450px] shadow-2xl !border-2 !border-red-500 relative`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-orbitron font-bold uppercase text-white">Top 3 Negativas</h2>
                  <button onClick={() => setMaximizedDashboardChart('top-negative')} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"><Maximize size={16} /></button>
                </div>
                {renderTopNegativeChart()}
              </div>

              {!isQualitative && (
                <div className="w-full lg:w-[25%] flex flex-col gap-4 h-[450px]">
                  <div className="glass-panel p-4 rounded-3xl flex-1 shadow-2xl relative flex flex-col min-h-0 transition-colors duration-500"
                    style={{
                      borderColor: lowestAvgSubject ? getGaugeColor(lowestAvgSubject.avg, maxGradeValue) : '#ef4444',
                      borderWidth: '2px'
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-[10px] font-orbitron font-bold uppercase text-white truncate max-w-[80%]">Média Baixa</h2>
                      <button onClick={() => setMaximizedDashboardChart('lowest-avg-gauge')} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"><Maximize size={14} /></button>
                    </div>
                    <div className="flex-1 min-h-0">
                      {lowestAvgSubject && renderGauge(
                        lowestAvgSubject.avg,
                        maxGradeValue,
                        getGaugeColor(lowestAvgSubject.avg, maxGradeValue),
                        'Média',
                        false,
                        false
                      )}
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-3xl flex-1 shadow-2xl !border-2 !border-purple-500 relative flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-[10px] font-orbitron font-bold uppercase text-white truncate max-w-[80%]">Maior Desvio</h2>
                      <button onClick={() => setMaximizedDashboardChart('highest-stddev-gauge')} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"><Maximize size={14} /></button>
                    </div>
                    <div className="flex-1 min-h-0">{highestStdDevSubject && renderGauge(highestStdDevSubject.stdDev, (isSecondThirdCycle) ? 2.5 : 10, '#d946ef', 'Desvio')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-4 animate-in slide-in-from-bottom-6 duration-500">
            {stats.map((s, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl border-2 group h-[420px] relative overflow-hidden shadow-2xl"
                style={{ borderColor: '#22d3ee' }}
              >
                <SubjectCardContent s={s} onExpand={() => setHoveredSubject(idx)} isQualitative={isQualitative} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 animate-in slide-in-from-bottom-4 duration-500 shadow-2xl relative">
            <div className="overflow-x-auto p-0 md:p-6">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-[0.2em] font-black text-xs">
                    <th className="px-4 py-2 sticky left-0 top-0 z-50 bg-[#020617] min-w-[60px] text-center border-r border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Nº</th>
                    <th className="px-4 py-2 sticky left-[60px] top-0 z-50 bg-[#020617] min-w-[140px] border-r border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Aluno</th>
                    {activeSubjects.map((label, i) => <th key={i} className="px-4 py-2 sticky top-0 z-40 bg-[#020617] text-center whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,0.5)]">{label}</th>)}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.map((student) => (
                    <tr key={student.numero} className="bg-slate-900/40 rounded-xl hover:bg-cyan-500/10 transition-all group">
                      <td className="px-4 py-2 text-cyan-400 font-mono font-bold sticky left-0 z-20 bg-[#020617] text-center border-r border-slate-800/50 transition-colors">
                        {student.numero}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-200 sticky left-[60px] z-20 bg-[#020617] border-r border-slate-800/50 whitespace-nowrap transition-colors">
                        {student.aluno}
                      </td>
                      {activeSubjects.map((subj, idx) => {
                        const grade = student.grades[subj] || 0;
                        return (
                          <td key={idx} className={`px-4 py-2 font-mono font-bold text-center whitespace-nowrap grade-glow ${getCellColorClass(grade)}`}>
                            {formatGradeForTable(grade)}
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

      {hoveredSubject !== null && activeTab === 'subjects' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80 animate-in duration-300">
          <div className="relative z-10 glass-panel p-16 rounded-[40px] !border-2 shadow-[0_0_120px_rgba(34,211,238,0.4)] w-[1000px] max-w-full"
            style={{ borderColor: '#22d3ee' }}
          >
            <SubjectCardContent s={stats[hoveredSubject]} isFocused isQualitative={isQualitative} />
            <button onClick={() => setHoveredSubject(null)} className="absolute top-8 right-8 text-slate-400 hover:text-white transition-all hover:scale-110"><X size={32} /></button>
          </div>
        </div>
      )}

      {maximizedDashboardChart !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-950/80 animate-in duration-300">
          <div className="relative z-10 glass-panel p-12 rounded-[40px] border-2 shadow-2xl w-[70vw] h-[70vh] flex flex-col overflow-hidden"
            style={{
              borderColor: maximizedDashboardChart === 'success-failure' ? '#10b981' :
                maximizedDashboardChart === 'top-negative' ? '#ef4444' :
                  maximizedDashboardChart === 'lowest-avg-gauge' ? (lowestAvgSubject ? getGaugeColor(lowestAvgSubject.avg, maxGradeValue) : '#f43f5e') :
                    maximizedDashboardChart === 'highest-stddev-gauge' ? '#d946ef' : '#ffffff'
            }}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-orbitron font-bold text-white uppercase tracking-widest">
                {maximizedDashboardChart === 'success-failure' && 'Sucesso/Insucesso'}
                {maximizedDashboardChart === 'top-negative' && 'Top 3 Disciplinas com Maior % de Negativas'}
                {maximizedDashboardChart === 'lowest-avg-gauge' && `Média Mais Baixa: ${lowestAvgSubject?.subject || 'N/A'}`}
                {maximizedDashboardChart === 'highest-stddev-gauge' && `Maior Desvio Padrão: ${highestStdDevSubject?.subject || 'N/A'}`}
              </h2>
              <button onClick={() => setMaximizedDashboardChart(null)} className="text-slate-400 hover:text-white transition-all hover:scale-110"><X size={32} /></button>
            </div>
            <div className="flex-1 min-h-0">
              {maximizedDashboardChart === 'success-failure' && renderSuccessFailureChart(true)}
              {maximizedDashboardChart === 'top-negative' && renderTopNegativeChart(true)}
              {maximizedDashboardChart === 'lowest-avg-gauge' && lowestAvgSubject && renderGauge(
                lowestAvgSubject.avg,
                maxGradeValue,
                getGaugeColor(lowestAvgSubject.avg, maxGradeValue),
                'Média',
                true
              )}
              {maximizedDashboardChart === 'highest-stddev-gauge' && highestStdDevSubject && renderGauge(highestStdDevSubject.stdDev, (isSecondThirdCycle) ? 2.5 : 10, '#d946ef', 'Desvio Padrão', true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const colorConfig: Record<string, { border: string, bg: string, text: string, bgHover: string, textHover: string, shadow: string, iconBg: string, neon: string, boxGradient: string }> = {
  emerald: {
    border: '!border-emerald-500',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    bgHover: 'group-hover:bg-emerald-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    iconBg: 'bg-emerald-500/20',
    neon: 'neon-text-emerald',
    boxGradient: 'from-emerald-500/10 to-transparent'
  },
  cyan: {
    border: '!border-cyan-500',
    bg: 'bg-cyan-500',
    text: 'text-cyan-400',
    bgHover: 'group-hover:bg-cyan-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
    iconBg: 'bg-cyan-500/20',
    neon: 'neon-text-cyan',
    boxGradient: 'from-cyan-500/10 to-transparent'
  },
  purple: {
    border: '!border-purple-500',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    bgHover: 'group-hover:bg-purple-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    iconBg: 'bg-purple-500/20',
    neon: 'neon-text-purple',
    boxGradient: 'from-purple-500/10 to-transparent'
  },
  yellow: {
    border: '!border-yellow-500',
    bg: 'bg-yellow-500',
    text: 'text-yellow-400',
    bgHover: 'group-hover:bg-yellow-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
    iconBg: 'bg-yellow-500/20',
    neon: 'neon-text-yellow',
    boxGradient: 'from-yellow-500/10 to-transparent'
  },
  orange: {
    border: '!border-orange-500',
    bg: 'bg-orange-500',
    text: 'text-orange-400',
    bgHover: 'group-hover:bg-orange-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
    iconBg: 'bg-orange-500/20',
    neon: 'neon-text-orange',
    boxGradient: 'from-orange-500/10 to-transparent'
  },
  pink: {
    border: '!border-pink-500',
    bg: 'bg-pink-500',
    text: 'text-pink-400',
    bgHover: 'group-hover:bg-pink-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    iconBg: 'bg-pink-500/20',
    neon: 'neon-text-magenta',
    boxGradient: 'from-pink-500/10 to-transparent'
  },
  // Fallback for default or others
  default: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    bgHover: 'group-hover:bg-emerald-500',
    textHover: 'group-hover:text-white',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    iconBg: 'bg-emerald-500/20',
    neon: 'neon-text-emerald',
    boxGradient: 'from-emerald-500/10 to-transparent'
  }
};

const CycleBox: React.FC<{ title: string, icon: React.ReactNode, color: string, sheets: SheetInfo[], selectedSheet: string, onSelect: (name: string) => void }> = ({ title, icon, color, sheets, selectedSheet, onSelect }) => {
  const styles = colorConfig[color] || colorConfig.default;
  return (
    <div className={`glass-panel p-5 rounded-3xl !border-l-[16px] bg-gradient-to-r ${styles.boxGradient} ${styles.border} shadow-xl flex flex-col md:flex-row gap-5 items-start md:items-center min-h-[120px] hover:!border-l-[20px] transition-all duration-300`}>
      <div className="flex flex-col items-center justify-center md:w-[180px] shrink-0">
        <div className={`flex items-center justify-center p-2.5 ${styles.iconBg} ${styles.text} rounded-2xl mb-2 w-14 h-14`}>{icon}</div>
        <h3 className="text-lg font-orbitron font-bold text-white uppercase tracking-wider text-center">{title}</h3>
      </div>

      <div className="w-full flex-1 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-5">
        {sheets.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sheets.map((s) => (
              <button key={s.id} onClick={() => onSelect(s.name)} className={`p-3 rounded-xl font-bold uppercase tracking-widest text-xs text-center transition-all transform hover:translate-x-1 hover:shadow-lg hover:scale-105 ${selectedSheet === s.name ? `${styles.bg} text-white shadow-lg ring-2 ring-white/20` : 'bg-slate-800/40 hover:bg-slate-700 text-slate-300'}`}>
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center border border-dashed border-slate-800 rounded-2xl p-4 h-full bg-slate-900/20">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">Sem Turmas</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, color: string, subtitle?: string, unit?: string }> = ({ title, value, icon, color, subtitle, unit }) => {
  const styles = colorConfig[color] || colorConfig.default;
  return (
    <div className={`glass-panel p-6 rounded-3xl border-l-4 ${styles.border} group transition-all shadow-lg hover:shadow-2xl hover:scale-105`}>
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-2 ${styles.iconBg} rounded-lg ${styles.text} ${styles.bgHover} ${styles.textHover} transition-all`}>{icon}</div>
        <p className="text-slate-500 text-[12px] font-bold uppercase tracking-widest">{title}</p>
      </div>
      <div className="flex flex-col">
        <h3 className={`text-3xl font-orbitron font-black ${styles.neon}`}>
          {typeof value === 'number' ? formatDecimal(value) : value}{unit || ''}
        </h3>
        {subtitle && <p className="text-[12px] font-bold text-slate-400 mt-1 uppercase truncate group-hover:text-white">{subtitle}</p>}
      </div>
    </div>
  );
};

export default App;
