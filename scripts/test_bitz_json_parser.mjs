// ============================================================================
// Comprehensive Test Suite: parseKnowledgeBitzJSON & AI Bitz Generation Pipeline
// ============================================================================

import { parseKnowledgeBitzJSON, validateBitzBatch } from '../src/utils/bitzContentValidator.ts';
import { generateBitzAiPrompt } from '../src/utils/bitzAiPromptGenerator.ts';

console.log('================================================================');
console.log('🧪 RUNNING KNOWLEDGE BITZ JSON PARSER & VALIDATOR TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

const sampleFact = {
  title: "Octopuses Have Three Hearts and Blue Blood",
  short_fact: "Two hearts pump blood to the gills while a third pumps blood to the rest of the body. Their blood is blue because it uses copper-based hemocyanin.",
  reading_text: "Octopuses possess three separate hearts that support their active circulatory system. Two branchial hearts pump deoxygenated blood through each of the animal's gills, where oxygen is absorbed directly from seawater. The third systemic heart pumps freshly oxygenated blood throughout the rest of the body. Interestingly, the systemic heart stops beating entirely whenever the octopus swims, which explains why these creatures prefer crawling along the ocean floor rather than swimming constantly. Furthermore, octopus blood contains hemocyanin, a specialized copper-rich protein that binds oxygen efficiently in freezing cold, oxygen-poor deep ocean waters, turning their blood a distinct shade of vivid blue.",
  category: "Science & Nature",
  subtopic: "Marine Life",
  difficulty: "Easy",
  cefr_level: "B1",
  source_citation: "National Geographic Ocean Wildlife Archives",
  quiz: [
    {
      question: "How many hearts does an octopus have?",
      options: ["Three", "Two", "Four", "One"],
      correct_answer: "Three",
      explanation: "Octopuses have two branchial hearts and one systemic heart.",
      xp: 2
    },
    {
      question: "What does the systemic heart do?",
      options: ["Pumps blood to the body", "Pumps blood only to gills", "Produces ink", "Controls tentacles"],
      correct_answer: "Pumps blood to the body",
      explanation: "The systemic heart circulates blood to the entire body.",
      xp: 2
    },
    {
      question: "Why is octopus blood blue?",
      options: ["It contains copper-based hemocyanin", "It lacks oxygen", "It has iron oxide", "It absorbs ocean pigment"],
      correct_answer: "It contains copper-based hemocyanin",
      explanation: "Hemocyanin is a copper-based protein that turns blue when bound to oxygen.",
      xp: 2
    },
    {
      question: "What happens to the systemic heart when an octopus swims?",
      options: ["It stops beating", "It beats twice as fast", "It pumps backwards", "It changes color"],
      correct_answer: "It stops beating",
      explanation: "The systemic heart stops beating during active swimming.",
      xp: 2
    },
    {
      question: "Why do octopuses prefer crawling over swimming?",
      options: ["Swimming quickly exhausts them", "Crawling is faster", "They cannot swim", "Their ink runs out"],
      correct_answer: "Swimming quickly exhausts them",
      explanation: "Because their systemic heart stops during swimming, it exhausts them quickly.",
      xp: 2
    }
  ]
};

// --------------------------------------------------------------------------
// TEST 1: Clean Single JSON Array
// --------------------------------------------------------------------------
console.log('--- 1. Testing Clean Single JSON Array ---');
const cleanJson = JSON.stringify([sampleFact], null, 2);
const res1 = parseKnowledgeBitzJSON(cleanJson);
assert(res1.success === true, 'Parses clean JSON array successfully');
assert(res1.records.length === 1, 'Extracts exactly 1 record');
assert(res1.hasTrailingContent === false, 'hasTrailingContent is false for clean array');
assert(res1.isMultipleDocuments === false, 'isMultipleDocuments is false');

// --------------------------------------------------------------------------
// TEST 2: Markdown Fences (```json ... ```)
// --------------------------------------------------------------------------
console.log('\n--- 2. Testing Markdown Fences (```json) ---');
const fencedJson = '```json\n' + cleanJson + '\n```';
const res2 = parseKnowledgeBitzJSON(fencedJson);
assert(res2.success === true, 'Successfully removes ```json fences and parses');
assert(res2.records.length === 1, 'Extracts record from markdown fenced input');
assert(res2.warning !== null, 'Provides warning note that markdown fences were stripped');

// --------------------------------------------------------------------------
// TEST 3: UTF-8 BOM & Invisible Characters
// --------------------------------------------------------------------------
console.log('\n--- 3. Testing UTF-8 BOM & Zero-Width Characters ---');
const bomJson = '\uFEFF\u200B\u200C' + cleanJson;
const res3 = parseKnowledgeBitzJSON(bomJson);
assert(res3.success === true, 'Strips UTF-8 BOM and zero-width characters');
assert(res3.records.length === 1, 'Extracts record from BOM-prefixed input');

// --------------------------------------------------------------------------
// TEST 4: Preamble Conversational Text Before JSON Array
// --------------------------------------------------------------------------
console.log('\n--- 4. Testing Preamble Conversational Text ---');
const preambleJson = 'Sure! Here is the JSON array for EdTechra Knowledge Bitz:\n\n' + cleanJson;
const res4 = parseKnowledgeBitzJSON(preambleJson);
assert(res4.success === true, 'Locates JSON array despite conversational preamble');
assert(res4.records.length === 1, 'Extracts record from preamble input');

// --------------------------------------------------------------------------
// TEST 5: Trailing Conversational Explanation (The Bug Reported by User!)
// --------------------------------------------------------------------------
console.log('\n--- 5. Testing Trailing Commentary After JSON Array ---');
const trailingCommentaryJson = cleanJson + '\n\nI hope these facts meet your requirements! Let me know if you would like me to adjust any CEFR vocabulary or word counts.';
const res5 = parseKnowledgeBitzJSON(trailingCommentaryJson);
assert(res5.success === false, 'Flags trailing commentary with success: false (does not silently ignore)');
assert(res5.hasTrailingContent === true, 'hasTrailingContent is strictly true');
assert(res5.isMultipleDocuments === false, 'isMultipleDocuments is false for text commentary');
assert(res5.error.includes('Extra content found after the JSON array'), 'Returns informative error for trailing content');
assert(res5.records.length === 1, 'Preserves parsed records for 1-click Auto-Strip action');
assert(res5.cleanedJson.startsWith('['), 'Provides clean stripped JSON in cleanedJson');

// --------------------------------------------------------------------------
// TEST 6: Multiple JSON Documents ([...] [...])
// --------------------------------------------------------------------------
console.log('\n--- 6. Testing Multiple JSON Documents ---');
const multipleDocsJson = cleanJson + '\n\n' + cleanJson;
const res6 = parseKnowledgeBitzJSON(multipleDocsJson);
assert(res6.success === false, 'Flags multiple JSON documents with success: false');
assert(res6.hasTrailingContent === true, 'hasTrailingContent is true');
assert(res6.isMultipleDocuments === true, 'isMultipleDocuments is strictly true');
assert(res6.error.includes('Multiple JSON documents detected'), 'Returns multiple document error message');
assert(res6.records.length === 1, 'Identifies first valid JSON document');

// --------------------------------------------------------------------------
// TEST 7: Backward Compatibility with Wrapped Object ({ "bitz": [...] })
// --------------------------------------------------------------------------
console.log('\n--- 7. Testing Wrapped Object { "bitz": [...] } ---');
const wrappedJson = JSON.stringify({ bitz: [sampleFact] }, null, 2);
const res7 = parseKnowledgeBitzJSON(wrappedJson);
assert(res7.success === true, 'Supports wrapped { "bitz": [...] } object for backward compatibility');
assert(res7.records.length === 1, 'Extracts bitz array from wrapped object');

// --------------------------------------------------------------------------
// TEST 8: Syntax Error with Diagnostics
// --------------------------------------------------------------------------
console.log('\n--- 8. Testing Syntax Error Handling ---');
const invalidJson = '[ { "title": "Missing quotes on value, "short_fact": 123 } ]';
const res8 = parseKnowledgeBitzJSON(invalidJson);
assert(res8.success === false, 'Fails on invalid JSON syntax');
assert(res8.errorDetails.type === 'syntax', 'errorDetails type is "syntax"');
assert(res8.error.includes('Invalid JSON syntax'), 'Provides clear syntax error description');
assert(typeof res8.errorDetails.lineNumber === 'number', 'Reports line number for error');

// --------------------------------------------------------------------------
// TEST 9: Empty / Whitespace Input
// --------------------------------------------------------------------------
console.log('\n--- 9. Testing Empty / Whitespace Input ---');
const res9 = parseKnowledgeBitzJSON('   \n\t  ');
assert(res9.success === false, 'Fails gracefully on empty input');
assert(res9.errorDetails.type === 'empty', 'errorDetails type is "empty"');

// --------------------------------------------------------------------------
// TEST 10: Canonical Validation Pipeline Integration
// --------------------------------------------------------------------------
console.log('\n--- 10. Testing Integration with validateBitzBatch ---');
const validationRes = validateBitzBatch(res1.records);
assert(validationRes.summary.total === 1, 'Validated exactly 1 batch record');
assert(validationRes.summary.valid === 1, 'Record validated as completely valid');
assert(validationRes.results[0].status === 'valid', 'Record status is "valid"');
assert(validationRes.results[0].metrics.quizCount === 5, 'Verified 5 quizzes (10 XP)');

// --------------------------------------------------------------------------
// TEST 11: Prompt Generator Strict Rules & Array Format
// --------------------------------------------------------------------------
console.log('\n--- 11. Testing AI Prompt Generator Output Format ---');
const generatedPrompt = generateBitzAiPrompt({
  categoryId: 'science_nature',
  cefrLevel: 'B1',
  quantity: 10
});
assert(generatedPrompt.includes('SINGLE JSON ARRAY ONLY'), 'Prompt instructs SINGLE JSON ARRAY ONLY');
assert(generatedPrompt.includes('NO ``` or ```json'), 'Prompt forbids markdown fences');
assert(generatedPrompt.includes('Do NOT include any introduction'), 'Prompt forbids preamble');
assert(generatedPrompt.includes('Do NOT include any conclusion'), 'Prompt forbids conclusion commentary');

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL KNOWLEDGE BITZ JSON PARSING & VALIDATION TESTS PASSED!\n');
}
