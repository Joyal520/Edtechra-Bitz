/**
 * EdTechra Digital Classroom — Pure PDF 1.4 Report Generator
 * Generates lightweight, professional vector PDF evaluation reports.
 */

function escapePdfText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Keep safe ASCII for standard PDF Helvetica font
}

function wrapText(text, maxCharsPerLine = 75) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates a clean A4 PDF Buffer for an AI OCR evaluation report
 */
export function generateEvaluationReportPdf({
  evaluationId,
  studentName = 'Student',
  teacherName = 'Teacher',
  classroomTitle = 'Classroom',
  category = 'Paragraph Writing',
  title = '',
  maxMarks = 100,
  score = 0,
  percentage = 0,
  performance = 'Good',
  breakdown = [],
  feedback = '',
  isTeacherAdjusted = false,
  completedAt = new Date().toISOString()
}) {
  const safeStudent = escapePdfText(studentName);
  const safeTeacher = escapePdfText(teacherName);
  const safeClass = escapePdfText(classroomTitle);
  const safeCategory = escapePdfText(category);
  const safeTitle = escapePdfText(title || 'Classroom Worksheet Assessment');
  const safeScore = `${Math.round(score)} / ${maxMarks}`;
  const safePercent = `${Math.round(percentage)}%`;
  const safePerf = escapePdfText(performance || 'Good');
  const safeDate = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const safeEvalId = escapePdfText(evaluationId || 'N/A');

  const streamCommands = [];

  // 1. Top Decorative Brand Bar (Primary Emerald/Teal Gradient simulation)
  streamCommands.push('0.02 0.44 0.36 rg'); // Teal/Emerald background (#05705b)
  streamCommands.push('0 770 595.28 72 re f'); // Top banner header

  // Header Title
  streamCommands.push('BT');
  streamCommands.push('/F2 20 Tf');
  streamCommands.push('1 1 1 rg'); // White text
  streamCommands.push('36 805 Td');
  streamCommands.push('(EDTECHRA DIGITAL CLASSROOM) Tj');
  streamCommands.push('ET');

  // Header Subtitle
  streamCommands.push('BT');
  streamCommands.push('/F1 11 Tf');
  streamCommands.push('0.85 0.95 0.90 rg');
  streamCommands.push('36 788 Td');
  streamCommands.push('(AI OCR Worksheet Evaluation Report) Tj');
  streamCommands.push('ET');

  // Date in Header Right
  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('450 795 Td');
  streamCommands.push(`(${safeDate}) Tj`);
  streamCommands.push('ET');

  // 2. Student & Assessment Info Box
  streamCommands.push('0.96 0.97 0.98 rg'); // Light slate background
  streamCommands.push('0.85 0.88 0.92 RG'); // Slate border
  streamCommands.push('1 w');
  streamCommands.push('36 670 523.28 85 re B'); // Fill & Stroke

  // Info Box Left Column
  streamCommands.push('BT');
  streamCommands.push('/F2 11 Tf');
  streamCommands.push('0.1 0.15 0.2 rg');
  streamCommands.push('50 730 Td');
  streamCommands.push(`(Student: ${safeStudent}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('0.3 0.35 0.4 rg');
  streamCommands.push('50 712 Td');
  streamCommands.push(`(Category: ${safeCategory}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 10 Tf');
  streamCommands.push('0.3 0.35 0.4 rg');
  streamCommands.push('50 694 Td');
  streamCommands.push(`(Task Title: ${safeTitle}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('0.4 0.45 0.5 rg');
  streamCommands.push('50 678 Td');
  streamCommands.push(`(Classroom: ${safeClass} | Teacher: ${safeTeacher}) Tj`);
  streamCommands.push('ET');

  // 3. Score Summary Card (Top Right inside/near info)
  streamCommands.push('0.06 0.55 0.42 rg'); // Emerald fill
  streamCommands.push('400 680 145 65 re f'); // Score pill box

  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('412 730 Td');
  streamCommands.push('(FINAL ASSESSMENT SCORE) Tj');
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 20 Tf');
  streamCommands.push('1 1 1 rg');
  streamCommands.push('412 705 Td');
  streamCommands.push(`(${safeScore}) Tj`);
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 9 Tf');
  streamCommands.push('0.9 0.98 0.94 rg');
  streamCommands.push('412 688 Td');
  streamCommands.push(`(${safePerf} • ${safePercent}${isTeacherAdjusted ? ' • Teacher Adjusted' : ''}) Tj`);
  streamCommands.push('ET');

  // 4. Section: Criteria & Performance Breakdown Table
  let currentY = 640;
  streamCommands.push('BT');
  streamCommands.push('/F2 13 Tf');
  streamCommands.push('0.08 0.12 0.18 rg');
  streamCommands.push(`36 ${currentY} Td`);
  streamCommands.push('(Evaluation Criteria & Score Breakdown) Tj');
  streamCommands.push('ET');

  currentY -= 20;

  // Table Header
  streamCommands.push('0.92 0.94 0.96 rg');
  streamCommands.push(`36 ${currentY} 523.28 22 re f`);

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.2 0.25 0.3 rg');
  streamCommands.push(`50 ${currentY + 6} Td`);
  streamCommands.push('(CRITERION / FOCUS AREA) Tj');
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.2 0.25 0.3 rg');
  streamCommands.push(`320 ${currentY + 6} Td`);
  streamCommands.push('(SCORE EARNED) Tj');
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.2 0.25 0.3 rg');
  streamCommands.push(`420 ${currentY + 6} Td`);
  streamCommands.push('(MAX MARKS) Tj');
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F2 9 Tf');
  streamCommands.push('0.2 0.25 0.3 rg');
  streamCommands.push(`495 ${currentY + 6} Td`);
  streamCommands.push('(PERCENT) Tj');
  streamCommands.push('ET');

  currentY -= 22;

  // Table Rows
  const items = Array.isArray(breakdown) && breakdown.length > 0
    ? breakdown
    : [{ criterion: 'General Competency & Quality', score: score, max: maxMarks }];

  items.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? '1 1 1 rg' : '0.98 0.98 0.99 rg';
    streamCommands.push(rowBg);
    streamCommands.push(`36 ${currentY} 523.28 20 re f`);

    // Bottom border
    streamCommands.push('0.90 0.92 0.94 RG');
    streamCommands.push('0.5 w');
    streamCommands.push(`36 ${currentY} m 559.28 ${currentY} l S`);

    const critName = escapePdfText(item.criterion || 'Criterion');
    const critScore = Number(item.score || 0);
    const critMax = Number(item.max || item.max_marks || 20);
    const critPct = critMax > 0 ? `${Math.round((critScore / critMax) * 100)}%` : '-';

    streamCommands.push('BT');
    streamCommands.push('/F1 9 Tf');
    streamCommands.push('0.1 0.15 0.2 rg');
    streamCommands.push(`50 ${currentY + 5} Td`);
    streamCommands.push(`(${critName}) Tj`);
    streamCommands.push('ET');

    streamCommands.push('BT');
    streamCommands.push('/F2 9 Tf');
    streamCommands.push('0.05 0.45 0.35 rg');
    streamCommands.push(`320 ${currentY + 5} Td`);
    streamCommands.push(`(${critScore} pts) Tj`);
    streamCommands.push('ET');

    streamCommands.push('BT');
    streamCommands.push('/F1 9 Tf');
    streamCommands.push('0.4 0.45 0.5 rg');
    streamCommands.push(`420 ${currentY + 5} Td`);
    streamCommands.push(`(${critMax} pts) Tj`);
    streamCommands.push('ET');

    streamCommands.push('BT');
    streamCommands.push('/F1 9 Tf');
    streamCommands.push('0.2 0.25 0.3 rg');
    streamCommands.push(`495 ${currentY + 5} Td`);
    streamCommands.push(`(${critPct}) Tj`);
    streamCommands.push('ET');

    currentY -= 20;
  });

  currentY -= 20;

  // 5. Section: AI Pedagogical Feedback
  streamCommands.push('BT');
  streamCommands.push('/F2 13 Tf');
  streamCommands.push('0.08 0.12 0.18 rg');
  streamCommands.push(`36 ${currentY} Td`);
  streamCommands.push('(AI Pedagogical Feedback & Guidance) Tj');
  streamCommands.push('ET');

  currentY -= 15;

  // Feedback Card Box
  const feedbackLines = wrapText(feedback || 'Good effort on this worksheet submission.', 70);
  const feedbackBoxHeight = Math.max(55, feedbackLines.length * 15 + 24);

  streamCommands.push('0.94 0.98 0.96 rg'); // Mint/emerald tint background
  streamCommands.push('0.6 0.85 0.72 RG'); // Subtle emerald border
  streamCommands.push('1 w');
  streamCommands.push(`36 ${currentY - feedbackBoxHeight + 10} 523.28 ${feedbackBoxHeight} re B`);

  let textY = currentY - 8;
  for (const line of feedbackLines) {
    streamCommands.push('BT');
    streamCommands.push('/F1 10 Tf');
    streamCommands.push('0.1 0.25 0.18 rg');
    streamCommands.push(`50 ${textY} Td`);
    streamCommands.push(`(${escapePdfText(line)}) Tj`);
    streamCommands.push('ET');
    textY -= 15;
  }

  // 6. Footer & Security Disclaimer
  streamCommands.push('0.85 0.88 0.92 RG');
  streamCommands.push('0.5 w');
  streamCommands.push('36 60 m 559.28 60 l S');

  streamCommands.push('BT');
  streamCommands.push('/F1 8 Tf');
  streamCommands.push('0.5 0.55 0.6 rg');
  streamCommands.push('36 45 Td');
  streamCommands.push('(Generated by EdTechra AI OCR Grader. Source student worksheet was processed securely and removed.) Tj');
  streamCommands.push('ET');

  streamCommands.push('BT');
  streamCommands.push('/F1 8 Tf');
  streamCommands.push('0.5 0.55 0.6 rg');
  streamCommands.push('400 45 Td');
  streamCommands.push(`(ID: ${safeEvalId.slice(0, 18)}...) Tj`);
  streamCommands.push('ET');

  // Compile PDF document structure
  const contentStream = streamCommands.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  const objects = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    // 3: Page
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj',
    // 4: Contents
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`,
    // 5: Font Regular (Helvetica)
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    // 6: Font Bold (Helvetica-Bold)
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj'
  ];

  let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += obj + '\n';
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += 'xref\n';
  body += `0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  body += 'trailer\n';
  body += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += 'startxref\n';
  body += `${xrefOffset}\n`;
  body += '%%EOF\n';

  return Buffer.from(body, 'utf8');
}
