import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { knowledgeBitzService } from '../server/knowledgeBitzService.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('Testing bulkImportBitz with 2 ~100-word records...');

  const sampleRecords = [
    {
      title: 'Your Phone Can Recognize Your Face',
      short_fact: 'Modern smartphones use infrared dots and neural networks to create a 3D depth map of your face.',
      reading_text: 'How does your phone know who you are? When you look at your smartphone, a tiny sensor projects thousands of invisible infrared dots across your facial contours. An infrared camera reads the pattern and transforms it into an encrypted mathematical model. Why is this facial technology safer than a simple photo? A flat picture cannot fool the system because the infrared camera checks for genuine three-dimensional depth. How does this help us in daily life? It lets you unlock your phone, authenticate school accounts, and secure private messages in milliseconds.',
      category: 'Technology & AI',
      subtopic: 'Biometrics',
      difficulty: 'Easy',
      cefr_level: 'A1',
      quiz: [
        {
          question: 'What does the phone project onto your face?',
          options: ['Invisible infrared dots', 'Laser beams', 'Sound waves', 'Flashlight beam'],
          correct_answer: 'Invisible infrared dots',
          explanation: 'It uses infrared dots to measure real 3D depth.'
        }
      ]
    },
    {
      title: 'QR Codes Can Hold Useful Information',
      short_fact: 'QR codes were created in 1994 by an automotive engineer to track car parts quickly during manufacturing.',
      reading_text: 'What exactly is a QR code? QR stands for Quick Response, and it is a two-dimensional matrix barcode composed of black squares on a white grid. Why can QR codes store so much data? Traditional barcodes only store numbers horizontally, but QR codes store data both vertically and horizontally. This geometry allows them to contain thousands of characters, including web links, text, and digital tickets. Where do we use QR codes today? People use them every day to read restaurant menus, make mobile payments, and share classroom assignments instantly.',
      category: 'Technology & AI',
      subtopic: 'Digital Systems',
      difficulty: 'Easy',
      cefr_level: 'A1',
      quiz: [
        {
          question: 'What does the letters QR stand for in QR code?',
          options: ['Quick Response', 'Quality Record', 'Quick Reading', 'Quantum Radio'],
          correct_answer: 'Quick Response',
          explanation: 'QR stands for Quick Response.'
        }
      ]
    }
  ];

  try {
    const result = await knowledgeBitzService.bulkImportBitz(
      sampleRecords,
      null,
      supabase,
      'A1'
    );

    console.log('Import result count:', result.importedCount);
    console.log('Import errors:', result.errors);
    console.log('Imported bitz_codes:', result.imported?.map(b => b.bitz_code));

    // Clean up test rows
    if (result.imported && result.imported.length > 0) {
      const ids = result.imported.map(b => b.id);
      await supabase.from('knowledge_bitz').delete().in('id', ids);
      console.log('Cleaned up test imported rows.');
    }
  } catch (err) {
    console.error('Import failed with error:', err);
  }
}

main().catch(console.error);
