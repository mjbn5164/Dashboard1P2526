
import { google } from 'googleapis';

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets.readonly']
);

const sheets = google.sheets({ version: 'v4', auth });

export async function fetchSpreadsheetMetadata(spreadsheetId: string) {
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    return response.data.sheets?.map(s => ({
      name: s.properties?.title || '',
      id: String(s.properties?.sheetId || '')
    })) || [];
  } catch (error) {
    console.error("Erro ao ler metadados do Sheets:", error);
    throw new Error("Não foi possível aceder à Folha de Cálculo. Verifique se o ID está correto e se a Service Account tem permissão de leitura.");
  }
}

export async function fetchSheetValues(spreadsheetId: string, range: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${range}'`,
    });
    return response.data.values || [];
  } catch (error) {
    console.error("Erro ao ler valores do Sheets:", error);
    throw new Error("Erro ao ler os dados da aba selecionada.");
  }
}
