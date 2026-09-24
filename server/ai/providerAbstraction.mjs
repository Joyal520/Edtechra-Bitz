// ============================================================================
// EDTECHRA AI PROVIDER ABSTRACTION
// Pluggable Two-Tier AI Architecture: Gemini (Tier 1) & OpenAI GPT-5 Nano (Tier 2)
// ============================================================================

import { OpenAI } from 'openai';
import { logAIUsage } from './aiUsageLogger.mjs';

const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest'
];

/**
 * Base AI Provider Abstraction
 */
export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  async generateStructured() {
    throw new Error('generateStructured must be implemented by subclass.');
  }

  async generateText() {
    throw new Error('generateText must be implemented by subclass.');
  }
}

/**
 * Tier 1 Provider: Google Gemini
 * High-volume, fast, cost-effective provider for simple/routine classroom operations.
 */
export class GeminiProvider extends AIProvider {
  constructor(options = {}) {
    super('gemini');
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    this.serverSupabase = options.serverSupabase || null;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /**
   * Cleans potential Markdown codeblocks from raw JSON responses.
   */
  privateCleanJson(text) {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
  }

  async generateStructured({
    prompt,
    systemPrompt = '',
    schema = null,
    taskType = 'general',
    timeoutMs = 15000
  }) {
    if (!this.apiKey) {
      throw new Error('GeminiProvider: GEMINI_API_KEY is not configured on the server.');
    }

    const startTime = Date.now();
    let lastError = null;

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const contents = [
          {
            parts: [
              { text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }
            ]
          }
        ];

        const generationConfig = {
          responseMimeType: 'application/json',
          temperature: 0.3
        };

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ contents, generationConfig })
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`Gemini HTTP ${resp.status}: ${errBody.slice(0, 150)}`);
        }

        const json = await resp.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error('Gemini returned an empty candidate part.');
        }

        const cleaned = this.privateCleanJson(rawText);
        const parsed = JSON.parse(cleaned);

        // Approximate or extract token usage
        const usage = json.usageMetadata || {};
        const inputTokens = usage.promptTokenCount || Math.round(prompt.length / 4);
        const outputTokens = usage.candidatesTokenCount || Math.round(rawText.length / 4);
        const totalTokens = usage.totalTokenCount || (inputTokens + outputTokens);

        await logAIUsage(this.serverSupabase, {
          provider: 'gemini',
          model: modelName,
          taskType,
          inputTokens,
          outputTokens,
          totalTokens,
          latencyMs: Date.now() - startTime,
          success: true
        });

        return {
          data: parsed,
          provider: 'gemini',
          model: modelName,
          inputTokens,
          outputTokens,
          totalTokens
        };
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiProvider] Attempt with ${modelName} failed:`, err.message);
      }
    }

    await logAIUsage(this.serverSupabase, {
      provider: 'gemini',
      model: CANDIDATE_GEMINI_MODELS[0],
      taskType,
      latencyMs: Date.now() - startTime,
      success: false,
      error: lastError?.message
    });

    throw lastError || new Error('All candidate Gemini models failed.');
  }

  async generateText({
    prompt,
    systemPrompt = '',
    taskType = 'general',
    timeoutMs = 15000
  }) {
    if (!this.apiKey) {
      throw new Error('GeminiProvider: GEMINI_API_KEY is not configured on the server.');
    }

    const startTime = Date.now();
    let lastError = null;

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const contents = [
          {
            parts: [
              { text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }
            ]
          }
        ];

        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.4 } })
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errBody = await resp.text().catch(() => '');
          throw new Error(`Gemini HTTP ${resp.status}: ${errBody.slice(0, 150)}`);
        }

        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const usage = json.usageMetadata || {};
        const inputTokens = usage.promptTokenCount || Math.round(prompt.length / 4);
        const outputTokens = usage.candidatesTokenCount || Math.round(text.length / 4);

        await logAIUsage(this.serverSupabase, {
          provider: 'gemini',
          model: modelName,
          taskType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          latencyMs: Date.now() - startTime,
          success: true
        });

        return {
          text,
          provider: 'gemini',
          model: modelName
        };
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiProvider Text] Attempt with ${modelName} failed:`, err.message);
      }
    }

    await logAIUsage(this.serverSupabase, {
      provider: 'gemini',
      model: CANDIDATE_GEMINI_MODELS[0],
      taskType,
      latencyMs: Date.now() - startTime,
      success: false,
      error: lastError?.message
    });

    throw lastError || new Error('All candidate Gemini models failed.');
  }
}

/**
 * Tier 2 Provider: OpenAI GPT-5 Nano
 * Specialized reasoning provider for complex educational tasks, structured activities,
 * exams, and deep Teaching Intelligence analysis.
 */
export class OpenAIProvider extends AIProvider {
  constructor(options = {}) {
    super('openai');
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-5-nano';
    this.serverSupabase = options.serverSupabase || null;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  /**
   * Economical Context Optimizer:
   * Strips repetitive instructions and truncates oversized contexts
   * to conserve prepaid tokens before invoking GPT-5 nano.
   */
  pruneContext(content, maxChars = 8000) {
    if (!content || typeof content !== 'string') return content;
    if (content.length <= maxChars) return content;

    // Prune middle section with marker
    const half = Math.floor(maxChars / 2);
    return `${content.slice(0, half)}\n\n[...context collapsed for economical processing...]\n\n${content.slice(-half)}`;
  }

  async generateStructured({
    prompt,
    systemPrompt = '',
    schema = null,
    taskType = 'complex_generation',
    maxRetries = 2
  }) {
    if (!this.client) {
      throw new Error('OpenAIProvider: OPENAI_API_KEY is not configured on the server.');
    }

    const prunedPrompt = this.pruneContext(prompt);
    const startTime = Date.now();

    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prunedPrompt }
    ];

    let responseFormat = { type: 'json_object' };
    if (schema && typeof schema === 'object') {
      responseFormat = {
        type: 'json_schema',
        json_schema: {
          name: 'structured_response',
          strict: false,
          schema
        }
      };
    }

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const isReasoningOrGpt5 = (this.model || '').includes('gpt-5') || (this.model || '').startsWith('o1') || (this.model || '').startsWith('o3');
        const reqPayload = {
          model: this.model,
          messages,
          response_format: responseFormat
        };
        if (!isReasoningOrGpt5) {
          reqPayload.temperature = 0.2;
        }

        const completion = await this.client.chat.completions.create(reqPayload);

        const rawContent = completion.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error('OpenAI returned an empty content body.');
        }

        const parsed = JSON.parse(rawContent);
        const usage = completion.usage || {};
        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;
        const totalTokens = usage.total_tokens || (inputTokens + outputTokens);

        await logAIUsage(this.serverSupabase, {
          provider: 'openai',
          model: this.model,
          taskType,
          inputTokens,
          outputTokens,
          totalTokens,
          latencyMs: Date.now() - startTime,
          success: true
        });

        return {
          data: parsed,
          provider: 'openai',
          model: this.model,
          inputTokens,
          outputTokens,
          totalTokens
        };
      } catch (err) {
        lastError = err;
        const isTransient = err.status === 429 || err.status >= 500 || (err.message && err.message.includes('timeout'));

        if (isTransient && attempt <= maxRetries) {
          const backoff = attempt * 800;
          console.warn(`[OpenAIProvider] Transient error on attempt ${attempt}, backing off ${backoff}ms:`, err.message);
          await new Promise(res => setTimeout(res, backoff));
        } else {
          break;
        }
      }
    }

    await logAIUsage(this.serverSupabase, {
      provider: 'openai',
      model: this.model,
      taskType,
      latencyMs: Date.now() - startTime,
      success: false,
      error: lastError?.message
    });

    throw lastError || new Error(`OpenAI completion failed after ${attempt} attempts.`);
  }

  async generateText({
    prompt,
    systemPrompt = '',
    taskType = 'general',
    maxRetries = 2
  }) {
    if (!this.client) {
      throw new Error('OpenAIProvider: OPENAI_API_KEY is not configured on the server.');
    }

    const prunedPrompt = this.pruneContext(prompt);
    const startTime = Date.now();

    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prunedPrompt }
    ];

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const isReasoningOrGpt5 = (this.model || '').includes('gpt-5') || (this.model || '').startsWith('o1') || (this.model || '').startsWith('o3');
        const reqPayload = {
          model: this.model,
          messages
        };
        if (!isReasoningOrGpt5) {
          reqPayload.temperature = 0.4;
        }

        const completion = await this.client.chat.completions.create(reqPayload);

        const text = completion.choices?.[0]?.message?.content || '';
        const usage = completion.usage || {};
        const inputTokens = usage.prompt_tokens || 0;
        const outputTokens = usage.completion_tokens || 0;

        await logAIUsage(this.serverSupabase, {
          provider: 'openai',
          model: this.model,
          taskType,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          latencyMs: Date.now() - startTime,
          success: true
        });

        return {
          text,
          provider: 'openai',
          model: this.model
        };
      } catch (err) {
        lastError = err;
        const isTransient = err.status === 429 || err.status >= 500;
        if (isTransient && attempt <= maxRetries) {
          await new Promise(res => setTimeout(res, attempt * 800));
        } else {
          break;
        }
      }
    }

    await logAIUsage(this.serverSupabase, {
      provider: 'openai',
      model: this.model,
      taskType,
      latencyMs: Date.now() - startTime,
      success: false,
      error: lastError?.message
    });

    throw lastError || new Error(`OpenAI text generation failed.`);
  }
}
