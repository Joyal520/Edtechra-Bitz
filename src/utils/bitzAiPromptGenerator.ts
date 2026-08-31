// ============================================================================
// EDTECHRA-BITZ: AI Prompt Generator for External AI Content Creation
// Generates structured prompts for Gemini, ChatGPT, Claude, etc.
// ============================================================================

import { getTopicById } from './bitzTopicsConfig';
import { getCefrLevelById } from './bitzCefrConfig';

export interface AiPromptConfig {
  topicId: string;
  cefrLevel: string;
  quantity: number;
}

/**
 * Generate a complete, copy-ready AI prompt for external AI tools.
 * The prompt instructs the AI to produce structured JSON output compatible
 * with EdTechra's BitzBulkImportRecord schema.
 */
export function generateBitzAiPrompt(config: AiPromptConfig): string {
  const topic = getTopicById(config.topicId);
  const cefr = getCefrLevelById(config.cefrLevel);

  return `You are an expert educational content writer for EdTechra, a microlearning platform.

Generate exactly ${config.quantity} unique Knowledge Bitz (micro-learning facts) about **${topic.name}** for English learners at **CEFR level ${cefr.id} (${cefr.shortLabel})**.

## CEFR Level Writing Guidelines
${cefr.promptInstructions}

## Content Requirements

Each Bitz MUST contain:

1. **title**: A curiosity-driven hook headline (5-15 words). Make it surprising, fascinating, or counter-intuitive. Examples: "Octopuses Have Three Hearts", "Bananas Are Slightly Radioactive", "Your Brain Uses 20% of Your Energy".

2. **short_fact**: A 1-2 sentence supporting explanation (15-40 words) that expands on the title. This is what users see on the discovery card. Keep it concise and intriguing.

3. **reading_text**: A clear educational explanation of 80-120 words. This is the full reading that teaches the concept. It must:
   - Explain the fact clearly using the CEFR ${cefr.id} English level
   - Teach exactly one clear idea
   - Remain interesting and engaging
   - NOT repeat the title unnecessarily
   - NOT use unnecessary technical language beyond the CEFR level
   - Flow naturally as a coherent mini-article

4. **topic_id**: Must be exactly "${config.topicId}"

5. **category**: Must be exactly "${topic.categoryGroup}"

6. **difficulty**: One of "Easy", "Medium", or "Hard" (knowledge difficulty, NOT English difficulty)

7. **source_citation**: A reliable reference or source for the fact. Use well-known sources (Wikipedia, NASA, Nature, BBC, National Geographic, etc.). If you cannot confidently provide a source, write "Requires administrator review" — do NOT fabricate URLs.

8. **quiz**: A multiple-choice quiz object containing:
   - **question**: A clear question answerable from the reading (1 sentence)
   - **options**: Exactly 4 answer options (array of 4 strings)
   - **correct_answer**: The exact text of the correct option (must match one of the 4 options exactly)
   - **explanation**: A brief 1-2 sentence explanation of why the answer is correct

## Strict Rules

- Create ORIGINAL educational content based on real, verified facts.
- ONE fact per Bitz — do not combine multiple unrelated facts.
- Do NOT repeat facts or rephrase the same idea with different wording.
- Do NOT generate images or image descriptions.
- Do NOT create trick quiz questions or questions unrelated to the reading.
- Quiz answers must be clearly derivable from the reading_text.
- Every fact must be scientifically/historically accurate.
- Avoid controversial, political, religious, or sensitive content.
- Do NOT include markdown, code fences, or explanatory text outside the JSON.

## Output Format

Return ONLY a valid JSON object with this exact structure (no markdown wrapping, no code fences, no explanations):

{
  "bitz": [
    {
      "title": "...",
      "short_fact": "...",
      "reading_text": "...",
      "topic_id": "${config.topicId}",
      "category": "${topic.categoryGroup}",
      "difficulty": "Easy",
      "source_citation": "...",
      "quiz": {
        "question": "...",
        "options": ["...", "...", "...", "..."],
        "correct_answer": "...",
        "explanation": "..."
      }
    }
  ]
}

Generate exactly ${config.quantity} unique, high-quality, factually accurate Knowledge Bitz. Quality is more important than quantity — if you cannot generate ${config.quantity} unique, accurate facts, generate fewer but ensure each one is excellent.

Return ONLY the JSON. No other text.`;
}
