
export interface StudentData {
  numero: number;
  aluno: string;
  grades: Record<string, number>;
}

export interface SheetData {
  subjects: string[];
  students: StudentData[];
}

export interface SheetInfo {
  name: string;
  id: string;
}

export interface GradeDistribution {
  range: string;
  count: number;
  chartValue: number;
  color: string;
}

export interface SubjectStats {
  subject: string;
  avg: number;
  stdDev: number;
  max: number;
  min: number;
  count: number;
  countBelowTen: number;
  percentageBelowTen: number;
  percentagePositive: number;
  distribution: GradeDistribution[];
  allGrades: number[];
}
