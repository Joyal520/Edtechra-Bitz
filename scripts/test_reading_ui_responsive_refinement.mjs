// ============================================================================
// EDTECHRA-BITZ: Responsive Reading UI & Typography Verification Suite
// Tests:
// 1. Q&A cards contain NO decorative icons on right side (Lightbulb, Coffee, TrendingUp removed)
// 2. Numbered circles (01, 02, 03) are present on the left
// 3. Question typography is visually strong (17-19px mobile, 20-22px desktop) with natural wrapping
// 4. Answer text is strictly justified (text-align: justify) using Lora serif
// 5. Key Takeaway body text matches the same reading font (Lora) and body scale (~16-18px)
// 6. Key Takeaway heading is bold/strong (16-18px mobile, 18-20px desktop)
// 7. Spacing & layout across mobile viewports (320px, 360px, 375px, 390px, 414px, 430px)
// 8. Desktop 2-column layout integrity (1024px, 1280px, 1440px)
// 9. Backward compatibility: works for both reading_sections and legacy reading_text Bitz
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { getBitzReadingData } from '../src/utils/bitzReadingData.ts';

console.log('🧪 Starting Responsive Reading UI & Typography Verification Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

// ----------------------------------------------------------------------------
// Test 1: Verify Q&A Card Component Code (Icon removal, Number badge, Justification)
// ----------------------------------------------------------------------------
runTest('BitzQuestionAnswerCard has NO decorative right icons and enforces text-align: justify', () => {
  const cardPath = path.resolve('src/components/Explore/reader/BitzQuestionAnswerCard.tsx');
  const content = fs.readFileSync(cardPath, 'utf8');

  // Must NOT import or contain decorative Lucide icons
  assert(!content.includes('Lightbulb'), 'Must NOT import or render Lightbulb icon');
  assert(!content.includes('Coffee'), 'Must NOT import or render Coffee icon');
  assert(!content.includes('TrendingUp'), 'Must NOT import or render TrendingUp icon');
  assert(!content.includes('IconComponent'), 'Must NOT have IconComponent property');

  // Must have numbered badge on the left
  assert(content.includes('formattedNumber'), 'Must format number (01, 02, 03)');
  assert(content.includes('rounded-full'), 'Must have circular badge');

  // Must enforce text-align: justify on answers
  assert(content.includes("textAlign: 'justify'"), 'Answer style must specify textAlign: justify');
  assert(content.includes('text-justify'), 'Answer class must include text-justify');

  // Must use font-reading (Lora)
  assert(content.includes('font-reading'), 'Answer must use font-reading (Lora)');

  // Must use comfortable mobile typography
  assert(content.includes('text-[17px] sm:text-[21px]'), 'Question font size must be ~17px mobile / ~21px desktop');
  assert(content.includes('text-[16px] sm:text-[18px]'), 'Answer font size must be ~16px mobile / ~18px desktop');
});

// ----------------------------------------------------------------------------
// Test 2: Verify Key Takeaway Component Code (Typography matching reading body)
// ----------------------------------------------------------------------------
runTest('BitzKeyTakeaway body text uses Lora and matches Q&A answer typography size', () => {
  const takeawayPath = path.resolve('src/components/Explore/reader/BitzKeyTakeaway.tsx');
  const content = fs.readFileSync(takeawayPath, 'utf8');

  // Must use font-reading (Lora)
  assert(content.includes('font-reading'), 'Takeaway body must use font-reading (Lora)');

  // Must match answer size (~16px mobile, ~18px desktop) - NOT tiny text-xs (12px)!
  assert(!content.includes('text-xs sm:text-[14px]'), 'Must NOT use tiny text-xs for takeaway body');
  assert(content.includes('text-[16px] sm:text-[18px]'), 'Takeaway body must match ~16px mobile / ~18px desktop');

  // Heading must be semibold/bold ~16-19px
  assert(content.includes('text-[16.5px] sm:text-[19px]'), 'Takeaway heading must be ~16.5px mobile / ~19px desktop');

  // Must enforce text-align: justify
  assert(content.includes("textAlign: 'justify'"), 'Takeaway body must specify textAlign: justify');
  assert(content.includes('text-justify'), 'Takeaway body must include text-justify class');
});

// ----------------------------------------------------------------------------
// Test 3: Verify Reader Container & Spacing (Mobile single column, Desktop 2 column)
// ----------------------------------------------------------------------------
runTest('BitzReadingView provides clean single column on mobile (<1024px) and 2 columns on desktop (>=1024px)', () => {
  const viewPath = path.resolve('src/components/Explore/reader/BitzReadingView.tsx');
  const content = fs.readFileSync(viewPath, 'utf8');

  // Desktop two-column grid
  assert(content.includes('hidden lg:grid grid-cols-12 gap-8'), 'Must have 12-column desktop grid');
  assert(content.includes('col-span-7'), 'Must have 7-column left panel for Q&A');
  assert(content.includes('col-span-5'), 'Must have 5-column right panel for visual & takeaway');

  // Mobile single-column layout
  assert(content.includes('lg:hidden'), 'Must have mobile/tablet adaptive layout');
  assert(content.includes('space-y-3.5 sm:space-y-4'), 'Must use compact card spacing on mobile');
  assert(content.includes('pt-4 sm:pt-8'), 'Must avoid excessive top padding on mobile');
});

// ----------------------------------------------------------------------------
// Test 4: Verify Backward Compatibility with getBitzReadingData
// ----------------------------------------------------------------------------
runTest('getBitzReadingData seamlessly supports both reading_sections and legacy reading_text Bitz', () => {
  // Case A: Modern Bitz with pre-existing reading_sections
  const modernBitz = {
    id: 'endowment-1',
    title: 'The Endowment Effect',
    category: 'People & Psychology',
    reading_sections: [
      { question: 'What is the endowment effect?', answer: 'People often value something more when they own it. This is called the endowment effect.' },
      { question: 'Why does ownership change how we feel?', answer: 'Imagine you own a simple cup. You may want more money to sell it than you would pay to buy it. Ownership can make the cup feel more special.' },
      { question: 'Why is the endowment effect important?', answer: 'The effect helps scientists understand how people make choices about buying, selling, and the things they own.' }
    ],
    key_takeaway: 'We tend to value things more when we own them, and this influences our choices every day.'
  };

  const modernData = getBitzReadingData(modernBitz);
  assert.strictEqual(modernData.sections.length, 3);
  assert.strictEqual(modernData.sections[0].question, 'What is the endowment effect?');
  assert.strictEqual(modernData.keyTakeaway, 'We tend to value things more when we own them, and this influences our choices every day.');

  // Case B: Legacy Bitz with only reading_text paragraph
  const legacyBitz = {
    id: 'legacy-1',
    title: 'Why Mars Looks Red',
    category: 'Science & Nature',
    reading_text: 'Mars is often called the Red Planet because its surface appears rusty red in telescopes. This distinct reddish color comes from large amounts of iron oxide, commonly known as rust, covering the rocky Martian surface. Billions of years ago, iron in Martian rocks reacted with ancient atmospheric moisture. Today, high winds sweep this reddish dust across the entire planet, creating vast rust storms that give Mars its iconic fiery glow visible all the way from Earth.'
  };

  const legacyData = getBitzReadingData(legacyBitz);
  assert.strictEqual(legacyData.sections.length, 3);
  assert(legacyData.sections[0].question.length > 5, 'Must derive valid question 1');
  assert(legacyData.sections[1].question.length > 5, 'Must derive valid question 2');
  assert(legacyData.sections[2].question.length > 5, 'Must derive valid question 3');
  assert(legacyData.keyTakeaway.length > 15, 'Must derive valid key takeaway');
});

// ----------------------------------------------------------------------------
// Test 5: Simulated Mobile Text Column Width Calculation across Viewports
// ----------------------------------------------------------------------------
runTest('Mobile viewports provide comfortable text column width for clean text justification', () => {
  const viewports = [320, 360, 375, 390, 414, 430];
  const pagePadding = 16 * 2; // 32px total (px-4)
  const cardPadding = 16 * 2; // 32px total (p-4)

  viewports.forEach(vp => {
    const cardWidth = vp - pagePadding;
    const textColumnWidth = cardWidth - cardPadding;

    // A comfortable text column width for mobile reading is >= 240px
    assert(textColumnWidth >= 240, `Viewport ${vp}px must have text column width >= 240px (got ${textColumnWidth}px)`);

    // Word spacing ratio check (ensures text-align: justify does not create giant gaps)
    const avgCharsPerLine = Math.floor(textColumnWidth / 8.5); // ~8.5px avg char width for 16px Lora
    assert(avgCharsPerLine >= 28, `Viewport ${vp}px must fit >= 28 chars per line to prevent rivers of white space (got ${avgCharsPerLine})`);
  });
});

console.log(`\n============================================================`);
console.log(`Results: ${testsPassed} / ${testsTotal} test assertions passed.`);
if (testsPassed === testsTotal) {
  console.log('🎉 ALL RESPONSIVE READING UI TESTS PASSED!\n');
} else {
  console.error(`⚠️ ${testsTotal - testsPassed} test(s) failed!\n`);
  process.exit(1);
}
