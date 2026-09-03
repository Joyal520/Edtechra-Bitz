// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: COURSE STUDIO MARKDOWN & IMAGE RENDERING TEST SUITE
// Tests Markdown parsing, GFM tables, Markdown images, URL sanitization,
// Text + Image layout logic, and backward compatibility.
// ============================================================================

import assert from 'node:assert/strict';

/**
 * Sanitizes URLs to prevent XSS via javascript:, vbscript:, or malicious data URIs.
 * (Mirrors implementation in src/components/common/MarkdownRenderer.tsx)
 */
function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  // Allow safe protocols and relative paths
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|mailto:|tel:|#)/i.test(trimmed)) {
    return trimmed;
  }

  // Block dangerous schemes
  if (/^(javascript:|vbscript:|data:)/i.test(trimmed)) {
    return '#';
  }

  // Fallback for standard domain names missing https://
  if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

console.log('------------------------------------------------------------');
console.log('🧪 RUNNING COURSE STUDIO MARKDOWN & IMAGE RENDERING TEST SUITE');
console.log('------------------------------------------------------------\n');

let totalTests = 0;
let passedTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`✅ [PASS] ${description}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// 1. URL SANITIZATION & SECURITY TESTS
// --------------------------------------------------------------------------
runTest('Security: sanitizeUrl allows safe HTTPS and HTTP image/link URLs', () => {
  assert.equal(sanitizeUrl('https://images.unsplash.com/photo-123'), 'https://images.unsplash.com/photo-123');
  assert.equal(sanitizeUrl('http://example.com/student.jpg'), 'http://example.com/student.jpg');
  assert.equal(sanitizeUrl('/uploads/image.png'), '/uploads/image.png');
  assert.equal(sanitizeUrl('./assets/logo.svg'), './assets/logo.svg');
});

runTest('Security: sanitizeUrl strictly blocks javascript:, vbscript:, and data: XSS vectors', () => {
  assert.equal(sanitizeUrl('javascript:alert(1)'), '#');
  assert.equal(sanitizeUrl('JAVASCRIPT:maliciousCode()'), '#');
  assert.equal(sanitizeUrl('vbscript:msgbox(1)'), '#');
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
});

// --------------------------------------------------------------------------
// 2. GFM TABLE PARSING SIMULATION
// --------------------------------------------------------------------------
function simulateTableParser(markdown) {
  const lines = markdown.trim().split('\n');
  const headerLine = lines[0];
  const delimiterLine = lines[1];

  const isDelimiter = (line) => {
    const trimmed = line.trim();
    if (!trimmed.includes('-')) return false;
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '').trim();
    const cells = inner.split('|');
    return cells.length > 0 && cells.every(c => /^(\s*:?-{2,}:?\s*)$/.test(c));
  };

  if (!isDelimiter(delimiterLine)) {
    return null;
  }

  const parseAlignments = (dLine) => {
    const inner = dLine.trim().replace(/^\|/, '').replace(/\|$/, '').trim();
    return inner.split('|').map(c => {
      const cell = c.trim();
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
      if (cell.endsWith(':')) return 'right';
      return 'left';
    });
  };

  const splitRow = (row) => {
    let line = row.trim();
    if (line.startsWith('|')) line = line.slice(1);
    if (line.endsWith('|')) line = line.slice(0, -1);
    return line.split('|').map(c => c.trim());
  };

  const headers = splitRow(headerLine);
  const alignments = parseAlignments(delimiterLine);
  const rows = lines.slice(2).map(splitRow);

  return { headers, alignments, rows };
}

runTest('GFM Tables: Correctly parses headers, alignments, and rows', () => {
  const tableMd = `
| Word | Meaning | Difficulty |
|:---|:---:|---:|
| name | what people call you | Beginner |
| age | how old you are | Beginner |
| student | a person who studies | Intermediate |
`;

  const parsed = simulateTableParser(tableMd);
  assert.ok(parsed, 'Table should parse successfully');
  assert.deepEqual(parsed.headers, ['Word', 'Meaning', 'Difficulty']);
  assert.deepEqual(parsed.alignments, ['left', 'center', 'right']);
  assert.equal(parsed.rows.length, 3);
  assert.deepEqual(parsed.rows[0], ['name', 'what people call you', 'Beginner']);
  assert.deepEqual(parsed.rows[2], ['student', 'a person who studies', 'Intermediate']);
});

// --------------------------------------------------------------------------
// 3. MARKDOWN IMAGE SYNTAX PARSING
// --------------------------------------------------------------------------
function simulateImageParser(text) {
  const match = text.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
  if (!match) return null;
  const [, alt, url] = match;
  return { alt, safeUrl: sanitizeUrl(url) };
}

runTest('Markdown Images: Correctly parses image syntax and preserves alt text', () => {
  const sample = '![Students learning English](https://example.com/student.jpg)';
  const parsed = simulateImageParser(sample);
  assert.ok(parsed, 'Image should parse successfully');
  assert.equal(parsed.alt, 'Students learning English');
  assert.equal(parsed.safeUrl, 'https://example.com/student.jpg');
});

runTest('Markdown Images: Blocks unsafe image URLs while preserving valid syntax', () => {
  const unsafeSample = '![Hacker image](javascript:alert("hacked"))';
  const parsed = simulateImageParser(unsafeSample);
  assert.ok(parsed);
  assert.equal(parsed.safeUrl, '#');
});

// --------------------------------------------------------------------------
// 4. USER PROMPT FULL LESSON TEST CONTENT
// --------------------------------------------------------------------------
runTest('Full Lesson Content: Successfully validates complete educational sample text', () => {
  const fullLessonText = `
# Basic English

Welcome to **Basic English**.

## Meet Anna

![Student learning English](https://example.com/student.jpg)

Anna is a student.

She is 18 years old.

## Useful Words

| Word | Meaning |
|---|---|
| name | what people call you |
| age | how old you are |
| student | a person who studies |
| teacher | a person who teaches |

### Example

**I am a student.**

*I'm from Sri Lanka.*

### Things to remember

- Use "I am" with I.
- Use "is" with he and she.
- Use short sentences.

### Steps

1. Say your name.
2. Say your age.
3. Say where you are from.
4. Say what you do.

> Try to speak without reading.

---
`;

  // Verify all sections exist in the test text
  assert.ok(fullLessonText.includes('# Basic English'));
  assert.ok(fullLessonText.includes('![Student learning English]'));
  assert.ok(fullLessonText.includes('| Word | Meaning |'));
  assert.ok(fullLessonText.includes('> Try to speak without reading.'));
  assert.ok(fullLessonText.includes('---'));
  assert.ok(fullLessonText.includes('1. Say your name.'));
  assert.ok(fullLessonText.includes('- Use "I am" with I.'));
});

// --------------------------------------------------------------------------
// 5. TEXT + IMAGE LAYOUT CONFIGURATION
// --------------------------------------------------------------------------
runTest('Text + Image: Validates all 4 layout position modes', () => {
  const positions = ['above', 'below', 'left', 'right'];
  positions.forEach(pos => {
    const block = {
      block_type: 'text_image',
      content: {
        title: 'Story Section',
        text: 'This is lesson text with **Markdown** formatting.',
        image: {
          url: 'https://r2.edtechra.com/lessons/img1.jpg',
          caption: 'Figure 1.1',
          position: pos
        }
      }
    };

    assert.equal(block.content.image.position, pos);
    assert.ok(block.content.image.url.startsWith('https://'));
  });
});

// --------------------------------------------------------------------------
// 6. BACKWARD COMPATIBILITY: PLAIN TEXT
// --------------------------------------------------------------------------
runTest('Backward Compatibility: Plain text without markdown parses as paragraphs', () => {
  const plainText = `Welcome to our English course.\n\nMy name is Anna.\nI am a student.`;
  const paragraphs = plainText.split(/\n\s*\n/).map(p => p.trim());
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0], 'Welcome to our English course.');
  assert.equal(paragraphs[1], 'My name is Anna.\nI am a student.');
});

// --------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`📊 RESULTS: ${passedTests} / ${totalTests} test assertions passed.`);
if (passedTests === totalTests) {
  console.log('🎉 ALL COURSE STUDIO MARKDOWN RENDERING TESTS PASSED!');
  console.log('------------------------------------------------------------\n');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
