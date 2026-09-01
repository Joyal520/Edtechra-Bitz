// ============================================================================
// EDTECHRA-BITZ: Knowledge Bitz CSV Exporter Engine
// Generates full UTF-8 BOM, RFC-4180 compliant CSV exports for Excel,
// Google Sheets, and data backups, flattening all 5 interactive quizzes.
// ============================================================================

import { KnowledgeBitzItem, normalizeQuizToArray } from '@/types';

/**
 * Escapes a cell value according to RFC 4180 CSV specifications.
 * Handles commas, double quotes, newlines, apostrophes, and Unicode.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates RFC 4180 compliant CSV content from a list of Knowledge Bitz items.
 * Includes UTF-8 BOM (\uFEFF) for immediate compatibility with Microsoft Excel.
 */
export function generateKnowledgeBitzCsv(bitzList: KnowledgeBitzItem[]): string {
  const headers = [
    'code',
    'title',
    'short_fact',
    'reading_text',
    'category',
    'subtopic',
    'difficulty',
    'cefr_level',
    'source_citation',
    'image_url',
    'status',
    'created_at',
    'updated_at',
    'image_source',
    'image_provider',
    'quiz_1_question',
    'quiz_1_option_1',
    'quiz_1_option_2',
    'quiz_1_option_3',
    'quiz_1_option_4',
    'quiz_1_correct_answer',
    'quiz_1_explanation',
    'quiz_1_xp',
    'quiz_2_question',
    'quiz_2_option_1',
    'quiz_2_option_2',
    'quiz_2_option_3',
    'quiz_2_option_4',
    'quiz_2_correct_answer',
    'quiz_2_explanation',
    'quiz_2_xp',
    'quiz_3_question',
    'quiz_3_option_1',
    'quiz_3_option_2',
    'quiz_3_option_3',
    'quiz_3_option_4',
    'quiz_3_correct_answer',
    'quiz_3_explanation',
    'quiz_3_xp',
    'quiz_4_question',
    'quiz_4_option_1',
    'quiz_4_option_2',
    'quiz_4_option_3',
    'quiz_4_option_4',
    'quiz_4_correct_answer',
    'quiz_4_explanation',
    'quiz_4_xp',
    'quiz_5_question',
    'quiz_5_option_1',
    'quiz_5_option_2',
    'quiz_5_option_3',
    'quiz_5_option_4',
    'quiz_5_correct_answer',
    'quiz_5_explanation',
    'quiz_5_xp'
  ];

  const rows = bitzList.map((item) => {
    let rawQuiz = item.quiz;
    if (typeof rawQuiz === 'string') {
      try {
        rawQuiz = JSON.parse(rawQuiz);
      } catch {
        rawQuiz = [];
      }
    }
    const questions = normalizeQuizToArray(rawQuiz);

    const rowData: unknown[] = [
      item.bitz_code || item.id || '',
      item.title || '',
      item.short_fact || '',
      item.reading_text || '',
      item.category || item.topic_id || '',
      item.sub_topic || '',
      item.difficulty || '',
      item.cefr_level || '',
      item.source_citation || '',
      item.visual_url || (item as any).image_url || '',
      item.status || 'draft',
      item.created_at || '',
      item.updated_at || '',
      item.image_source || '',
      (item as any).image_provider || item.image_source || ''
    ];

    // Flatten all 5 quizzes
    for (let i = 0; i < 5; i++) {
      const q = questions[i] || null;
      const opts = q && Array.isArray(q.options) ? q.options : [];
      rowData.push(
        q ? q.question || '' : '',
        opts[0] || '',
        opts[1] || '',
        opts[2] || '',
        opts[3] || '',
        q ? q.correct_answer || (q as any).correctAnswer || '' : '',
        q ? q.explanation || '' : '',
        q ? (q as any).xpReward || (q as any).xp || 2 : ''
      );
    }

    return rowData.map(escapeCsvCell).join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) and join lines with CRLF for standard CSV
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers a direct browser download of the generated CSV file.
 */
export function downloadKnowledgeBitzCsv(bitzList: KnowledgeBitzItem[], customFilename?: string): void {
  const csvContent = generateKnowledgeBitzCsv(bitzList);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `edtechra-bitz-all-facts-${dateStr}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
