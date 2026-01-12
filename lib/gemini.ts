
import { GoogleGenAI, Type } from "@google/genai";
import { SheetData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function analyzeGradesWithGemini(textData: string): Promise<SheetData> {
  const prompt = `
    Analise o seguinte texto bruto de uma Google Sheet e extraia os dados estruturados.
    
    ESTRUTURA:
    1. Linha 1: Cabeçalhos.
    2. Coluna A: Nº. Coluna B: Nome. Coluna C+: Disciplinas.
    
    CONVERSÃO:
    - Pré-Escolar: "Adquirido"->3, "Em Aquisição"->2, "Não Adquirido"->1.
    - 1º Ciclo: "Muito Bom"->5, "Bom"->4, "Suficiente"->3, "Insuficiente"->2.
    
    DADOS:
    ${textData}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
          students: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                numero: { type: Type.INTEGER },
                aluno: { type: Type.STRING },
                scores: { type: Type.ARRAY, items: { type: Type.NUMBER } }
              },
              required: ["numero", "aluno", "scores"]
            }
          }
        },
        required: ["subjects", "students"]
      }
    }
  });

  const parsed = JSON.parse(response.text || '{"subjects":[], "students":[]}');
  
  const students = parsed.students.map((s: any) => {
    const grades: Record<string, number> = {};
    parsed.subjects.forEach((subj: string, index: number) => {
      grades[subj] = s.scores[index] || 0;
    });
    return { numero: s.numero, aluno: s.aluno, grades };
  });

  return { subjects: parsed.subjects, students };
}
