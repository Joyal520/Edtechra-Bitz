import fs from 'fs';
import path from 'path';

const markdownContent = fs.readFileSync('C:/Users/hecsb/Downloads/Elektra_Bitz_First_20_Shuffled_Content.md', 'utf8');

// Video IDs corresponding to the first 20 levels
const videoIds = [
  'Xj3gbHlFQEo', // Level 1
  'QoiXpyzzPPA', // Level 2
  '9I0-lpeaAiE', // Level 3
  'QbOLGiuxNNE', // Level 4
  'XB4FUo9cJE8', // Level 5
  '-Q2rpPKzzJM', // Level 6
  'NZUXlmkRh5k', // Level 7
  'I4B--ku52Tg', // Level 8
  'oyb774hyKc0', // Level 9
  '2o2PQXGbsmc', // Level 10
  'lJt_vzBNQbI', // Level 11
  'S-McV5dA2fQ', // Level 12
  'j1ZGNps9XCg', // Level 13
  'UZPTJJNIhOk', // Level 14
  'VUhM5v3_rEw', // Level 15
  'W5LSKB5TEVA', // Level 16
  'ZXIEoI55NRs', // Level 17
  'ZyHGCEEpiHI', // Level 18
  'EizNwDGRwsA', // Level 19
  'TTS18cuzHJ4'  // Level 20
];

const levelBlocks = markdownContent.split(/### Level\s+(\d+)\s+[—–-]\s+/).filter(Boolean);
const levels = [];

for (let i = 0; i < levelBlocks.length; i += 2) {
  const levelNum = parseInt(levelBlocks[i], 10);
  const block = levelBlocks[i+1];
  const videoId = videoIds[levelNum - 1];
  
  const titleLine = block.split('\n')[0].trim();
  const explMatch = block.match(/\*\*50-word explanation:\*\*\s*\n+([\s\S]*?)(?=\n+\*\*Quiz:\*\*)/);
  const explanation = explMatch ? explMatch[1].trim() : '';
  
  // Parse quiz
  const qRegex = /\*\*(\d+)\.\s+([^\n]+)\*\*\s*\n+-\s+A\.\s+([^\n]+)\n+-\s+B\.\s+([^\n]+)\n+-\s+C\.\s+([^\n]+)\n+-\s+D\.\s+([^\n]+)\n+-\s+\*\*Answer:\s+([A-D])\*\*/g;
  let qMatch;
  const questions = [];
  while ((qMatch = qRegex.exec(block)) !== null) {
    const qNum = parseInt(qMatch[1], 10);
    const correctLetter = qMatch[7].trim();
    const options = [
      { id: 'opt_a', text: qMatch[3].trim(), isCorrect: correctLetter === 'A' },
      { id: 'opt_b', text: qMatch[4].trim(), isCorrect: correctLetter === 'B' },
      { id: 'opt_c', text: qMatch[5].trim(), isCorrect: correctLetter === 'C' },
      { id: 'opt_d', text: qMatch[6].trim(), isCorrect: correctLetter === 'D' }
    ];
    const correctOption = options.find(o => o.isCorrect);

    questions.push({
      id: `l${levelNum}_q${qNum}`,
      question: qMatch[2].trim(),
      options,
      correctIndex: ['A', 'B', 'C', 'D'].indexOf(correctLetter),
      explanation: `Correct answer: ${correctLetter}. ${correctOption?.text}`
    });
  }

  levels.push({
    levelNumber: levelNum,
    title: titleLine,
    youtubeVideoId: videoId,
    explanation,
    questions
  });
}

console.log(`Successfully parsed ${levels.length} levels from markdown.`);

// Generate TypeScript file src/utils/levelsData.ts
const tsContent = `// ============================================================================
// ELEKTRA BITZ — LEVELS 1-20 SOURCE OF TRUTH DATA
// Generated from authoritative Markdown content. DO NOT MODIFY DIRECTLY.
// ============================================================================

import { QuizQuestion } from '@/types';

export interface LevelDefinition {
  levelNumber: number;
  title: string;
  youtubeVideoId: string;
  explanation: string;
  questions: QuizQuestion[];
}

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export const ELEKTRA_LEVELS_1_20: LevelDefinition[] = ${JSON.stringify(levels, null, 2)};

export function getLevelByNumber(levelNumber: number): LevelDefinition | undefined {
  return ELEKTRA_LEVELS_1_20.find(l => l.levelNumber === levelNumber);
}

export function getLevelByVideoId(videoId: string): LevelDefinition | undefined {
  return ELEKTRA_LEVELS_1_20.find(l => l.youtubeVideoId === videoId);
}

export function getAllLevels(): LevelDefinition[] {
  return ELEKTRA_LEVELS_1_20;
}

export function isLevelInSeries(videoIdOrLevel: string | number): boolean {
  if (typeof videoIdOrLevel === 'number') {
    return videoIdOrLevel >= 1 && videoIdOrLevel <= 20;
  }
  const parsed = parseInt(videoIdOrLevel, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
    return true;
  }
  return ELEKTRA_LEVELS_1_20.some(l => l.youtubeVideoId === videoIdOrLevel);
}

/**
 * Determines whether a given level is unlocked based on user's progress.
 * Rule: Level 1 is always unlocked.
 * Level N (N > 1) is unlocked IF AND ONLY IF Level N-1 is completed with score >= 2.
 */
export function isLevelUnlocked(
  levelNumber: number,
  progressMap: { [videoIdOrLevel: string]: { completed?: boolean; quiz_score?: number; quizScore?: number } }
): boolean {
  if (levelNumber <= 1) return true;
  
  const prevLevel = getLevelByNumber(levelNumber - 1);
  if (!prevLevel) return false;

  const prevProgress = progressMap[prevLevel.youtubeVideoId] || progressMap[\`level-\${levelNumber - 1}\`] || progressMap[\`\${levelNumber - 1}\`];
  if (!prevProgress) return false;

  const isCompleted = !!prevProgress.completed;
  const score = prevProgress.quiz_score !== undefined ? prevProgress.quiz_score : (prevProgress.quizScore || 0);

  return isCompleted && score >= 2;
}

/**
 * Returns detailed status for a level: 'locked' | 'available' | 'in_progress' | 'completed'
 */
export function getLevelStatus(
  levelNumber: number,
  progressMap: { [videoIdOrLevel: string]: { completed?: boolean; quiz_score?: number; quizScore?: number; watched?: boolean } }
): LevelStatus {
  if (!isLevelUnlocked(levelNumber, progressMap)) {
    return 'locked';
  }

  const level = getLevelByNumber(levelNumber);
  if (!level) return 'locked';

  const progress = progressMap[level.youtubeVideoId] || progressMap[\`level-\${levelNumber}\`] || progressMap[\`\${levelNumber}\`];
  if (!progress) return 'available';

  const isCompleted = !!progress.completed;
  const score = progress.quiz_score !== undefined ? progress.quiz_score : (progress.quizScore || 0);

  if (isCompleted && score >= 2) {
    return 'completed';
  }

  if (progress.watched || score > 0) {
    return 'in_progress';
  }

  return 'available';
}

export function getNextLevelNumber(currentLevelNumber: number): number | null {
  if (currentLevelNumber >= 20) return null;
  return currentLevelNumber + 1;
}
`;

fs.writeFileSync('src/utils/levelsData.ts', tsContent, 'utf8');
console.log('✓ Written src/utils/levelsData.ts successfully.');
