import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const classroomId = '7c896a5c-6e95-46f0-98d1-3f0d5598d156';

async function main() {
  const { data: ocrList } = await supabase
    .from('ocr_evaluations')
    .select('id, breakdown_json')
    .eq('class_id', classroomId)
    .eq('status', 'completed');
  console.log('Completed OCR evaluations with breakdown:', ocrList?.length);
  if (ocrList && ocrList.length > 0) {
    console.log('Sample breakdown:', JSON.stringify(ocrList[0].breakdown_json));
  }
}

main().catch(console.error);
