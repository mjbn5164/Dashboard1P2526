
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SheetData } from "../types";

const ai = new GoogleGenerativeAI(process.env.API_KEY || '');

export async function analyzeGradesWithGemini(textData: string): Promise<SheetData> {
  const model = ai.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          subjects: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          students: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                numero: { type: SchemaType.NUMBER },
                aluno: { type: SchemaType.STRING },
                scores: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } }
              },
              required: ["numero", "aluno", "scores"]
            }
          }
        },
        required: ["subjects", "students"]
      }
    }
  });

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

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const parsed = JSON.parse(response.text());

  const students = parsed.students.map((s: any) => {
    const grades: Record<string, number> = {};
    parsed.subjects.forEach((subj: string, index: number) => {
      grades[subj] = s.scores[index] || 0;
    });
    return { numero: s.numero, aluno: s.aluno, grades };
  });

  return { subjects: parsed.subjects, students };
}
