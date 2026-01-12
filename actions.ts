
"use server";

import { fetchSpreadsheetMetadata, fetchSheetValues } from "./lib/sheets";
import { analyzeGradesWithGemini } from "./lib/gemini";
import { SheetData, SheetInfo } from "./types";

export async function connectSpreadsheetAction(sheetId: string): Promise<SheetInfo[]> {
  if (!sheetId) throw new Error("ID da folha é obrigatório");
  return await fetchSpreadsheetMetadata(sheetId);
}

export async function loadAndAnalyzeSheetAction(sheetId: string, sheetName: string): Promise<SheetData> {
  const values = await fetchSheetValues(sheetId, sheetName);
  if (!values || values.length === 0) return { subjects: [], students: [] };
  
  const textData = values.map((r: any) => r.join(', ')).join('\n');
  return await analyzeGradesWithGemini(textData);
}
