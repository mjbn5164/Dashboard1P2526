
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { SheetData } from "../types";

export const extractDataFromSheetsText = async (text: string, apiKey: string): Promise<SheetData> => {
  console.log("Gemini Service received API Key:", apiKey ? "YES (Starts with " + apiKey.substring(0, 4) + ")" : "NO/UNDEFINED");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          subjects: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          },
          students: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                numero: { type: SchemaType.NUMBER },
                aluno: { type: SchemaType.STRING },
                scores: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.NUMBER }
                }
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
      
      ESTRUTURA DA FOLHA:
      1. A LINHA 1 contém os cabeçalhos.
      2. Coluna A (1ª): Nº do aluno.
      3. Coluna B (2ª): Nome do Aluno.
      4. Coluna C (3ª) em diante: Nomes das DISCIPLINAS.
      
      CONVERSÃO DE NOTAS (MUITO IMPORTANTE):
      Converta avaliações qualitativas para números para permitir cálculos:
      
      PRÉ-ESCOLAR:
      - "Adquirido" ou "Adquirida" -> 3
      - "Em Aquisição" -> 2
      - "Não Adquirido" ou "Não Adquirida" -> 1
      
      1.º CICLO:
      - "Muito Bom" -> 5
      - "Bom" -> 4
      - "Suficiente" -> 3
      - "Insuficiente" -> 2
      - "Não Satisfaz" -> 2
      - "Satisfaz" -> 3
      
      NOTAS NUMÉRICAS:
      - Para escalas 1-5 ou 1-20, mantenha o valor original.
      - Se o campo estiver vazio, "S/C" ou não-numérico/desconhecido, use 0.
      
      TAREFA:
      1. Identifique todas as disciplinas presentes na primeira linha a partir da coluna C.
      2. Para cada linha subsequente, extraia o número, o nome e as notas correspondentes.
      3. Ignore linhas de rodapé ou vazias.
      
      Retorne um objeto JSON com:
      - "subjects": Array com os nomes das disciplinas.
      - "students": Array de objetos com "numero", "aluno" e "scores" (array de números na mesma ordem das "subjects").
      
      Texto bruto:
      ${text}
    `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = JSON.parse(response.text());

    const students = data.students.map((s: any) => {
      const grades: Record<string, number> = {};
      data.subjects.forEach((subj: string, index: number) => {
        grades[subj] = s.scores[index] || 0;
      });
      return {
        numero: s.numero,
        aluno: s.aluno,
        grades: grades
      };
    });

    return {
      subjects: data.subjects,
      students: students
    };
  } catch (e: any) {
    console.error("Erro na extração Gemini:", e);
    throw e;
  }
};
