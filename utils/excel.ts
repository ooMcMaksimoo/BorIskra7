import * as XLSX from 'xlsx';
import { Platform } from 'react-native';

export interface RecordExport {
  id: string;
  date: string;
  timestamp: number;
  user: string;
  role: string;
  product: string;
  qty: number;
  comment?: string;
}

export async function exportRecordsToExcel(records: RecordExport[]): Promise<void> {
  const data = records.map((r) => ({
    Дата: r.date,
    Сотрудник: r.user,
    Роль: r.role === 'manager' ? 'Руководитель' : 'Сварщик',
    Продукция: r.product,
    Количество: r.qty,
    Комментарий: r.comment || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = [
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 30 },
    { wch: 12 },
    { wch: 30 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Записи сварки');

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, 'boriskra_records.xlsx');
    return;
  }

  const { default: FileSystem } = await import('expo-file-system');
  const { shareAsync } = await import('expo-sharing');

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fileUri = FileSystem.cacheDirectory + 'boriskra_records.xlsx';
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await shareAsync(fileUri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Экспорт записей',
    UTI: 'com.microsoft.excel.xlsx',
  });
}

export async function parseProductsFromFile(
  uri: string,
  fileObject?: File
): Promise<string[]> {
  let wb: XLSX.WorkBook;

  if (Platform.OS === 'web' && fileObject) {
    const arrayBuffer = await fileObject.arrayBuffer();
    wb = XLSX.read(arrayBuffer, { type: 'array' });
  } else {
    const { default: FileSystem } = await import('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    wb = XLSX.read(base64, { type: 'base64' });
  }

  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  const names: string[] = [];
  rows.forEach((row) => {
    if (!Array.isArray(row)) return;
    const cell = row[0];
    if (cell == null) return;
    const name = String(cell).trim();
    if (name) names.push(name);
  });

  return names;
}

export async function exportProductsToExcel(
  products: { name: string }[]
): Promise<void> {
  const data = products.map((p) => ({ Продукция: p.name }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Продукция');

  if (Platform.OS === 'web') {
    XLSX.writeFile(wb, 'boriskra_products.xlsx');
    return;
  }

  const { default: FileSystem } = await import('expo-file-system');
  const { shareAsync } = await import('expo-sharing');

  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const fileUri = FileSystem.cacheDirectory + 'boriskra_products.xlsx';
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await shareAsync(fileUri, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Экспорт продукции',
    UTI: 'com.microsoft.excel.xlsx',
  });
}
