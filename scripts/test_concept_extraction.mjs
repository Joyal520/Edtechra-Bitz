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

// Concept Extractor Prototype
function parseConceptHierarchy(rawTopic, rawTitle, category, metadata) {
  const combined = `${rawTitle || ''} ${rawTopic || ''}`.trim();
  
  // 1. Explicit separator: "Topic — Skill" or "Topic: Skill" or "Topic - Skill"
  for (const sep of [' — ', ' – ', ' : ', ': ', ' - ']) {
    if (combined.includes(sep)) {
      const parts = combined.split(sep);
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        const top = parts[0].trim().replace(/^(Unit Test on the|Unit Test on|Quiz on|Assessment:|Test on)\s*/i, '');
        const skl = parts[1].trim();
        return {
          category: category || 'Grammar',
          topic: top,
          skill: skl,
          displayName: `${top} — ${skl}`,
          isPlaceholder: false
        };
      }
    }
  }

  // 2. Known patterns
  if (/simple past/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Simple Past',
      skill: /negative/i.test(combined) ? 'Negative Forms' : 'Past Tense Forms',
      displayName: /negative/i.test(combined) ? 'Simple Past — Negative Forms' : 'Simple Past — Past Tense Forms',
      isPlaceholder: false
    };
  }

  if (/simple present/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Simple Present',
      skill: /negative/i.test(combined) ? 'Negative Forms' : 'Affirmative & Question Forms',
      displayName: /negative/i.test(combined) ? 'Simple Present — Negative Forms' : 'Simple Present — Affirmative & Questions',
      isPlaceholder: false
    };
  }

  if (/preposition/i.test(combined) || /at.*in.*on/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Prepositions',
      skill: 'at / in / on',
      displayName: 'Prepositions — at / in / on',
      isPlaceholder: false
    };
  }

  if (/conjunction/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Conjunctions',
      skill: 'Connecting Clauses (and/but/so/or)',
      displayName: 'Conjunctions — Connecting Clauses',
      isPlaceholder: false
    };
  }

  if (/am,\s*is,\s*are|was,\s*were/i.test(combined)) {
    return {
      category: 'Grammar',
      topic: 'Be Verbs',
      skill: 'am / is / are / was / were',
      displayName: 'Be Verbs — am / is / are / was / were',
      isPlaceholder: false
    };
  }

  if (/paragraph writing/i.test(combined) || category === 'Paragraph Writing') {
    return {
      category: 'Writing',
      topic: 'Paragraph Writing',
      skill: 'Paragraph Organization & Flow',
      displayName: 'Paragraph Writing — Organization & Flow',
      isPlaceholder: false
    };
  }

  if (/essay writing/i.test(combined) || category === 'Essay Writing') {
    return {
      category: 'Writing',
      topic: 'Essay Writing',
      skill: 'Thesis & Supporting Structure',
      displayName: 'Essay Writing — Structure & Development',
      isPlaceholder: false
    };
  }

  if (/story writing/i.test(combined) || /mermaids/i.test(combined)) {
    return {
      category: 'Writing',
      topic: 'Creative Story Writing',
      skill: 'Narrative Pacing & Character',
      displayName: 'Creative Writing — Narrative Development',
      isPlaceholder: false
    };
  }

  // Placeholder check
  const lower = combined.toLowerCase();
  if (lower === 'other' || lower === 'general task' || lower === 'science' || lower === 'assignment' || lower === 'task') {
    return {
      category: 'General',
      topic: combined,
      skill: 'General Review',
      displayName: combined,
      isPlaceholder: true
    };
  }

  return {
    category: category || 'General',
    topic: rawTopic || rawTitle || 'General',
    skill: 'Core Comprehension',
    displayName: `${rawTopic || rawTitle || 'General'} — Core Concepts`,
    isPlaceholder: false
  };
}

async function main() {
  const { data: events } = await supabase
    .from('v_classroom_learning_events')
    .select('*')
    .eq('classroom_id', classroomId);

  const concepts = new Map();

  for (const ev of events || []) {
    // If OCR has breakdown_json with criteria, also inspect criteria
    const hierarchy = parseConceptHierarchy(ev.topic, ev.activity_title, ev.category, ev.metadata);
    if (hierarchy.isPlaceholder) continue;

    const key = hierarchy.displayName;
    if (!concepts.has(key)) {
      concepts.set(key, {
        hierarchy,
        scores: [],
        sources: new Set(),
        students: new Set(),
        affectedStudents: new Set()
      });
    }

    const c = concepts.get(key);
    const pct = Number(ev.percentage);
    if (!isNaN(pct)) {
      c.scores.push(pct);
      c.sources.add(ev.activity_type);
      c.students.add(ev.student_id);
      if (pct < 70) {
        c.affectedStudents.add(ev.student_id);
      }
    }
  }

  console.log('--- CONCEPTS IDENTIFIED ---');
  for (const [key, data] of concepts.entries()) {
    const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
    const sources = Array.from(data.sources);
    const confidence = sources.length >= 2 ? 'CONFIRMED GAP' : 'EARLY SIGNAL';
    console.log(`Concept: "${key}"`);
    console.log(`  Accuracy: ${avg}%`);
    console.log(`  Students Affected: ${data.affectedStudents.size} of 6`);
    console.log(`  Evidence Sources (${sources.length}): ${sources.join(', ')}`);
    console.log(`  Confidence: ${confidence}`);
  }
}

main().catch(console.error);
