// ============================================================================
// EDTECHRA CENTRAL AI ROUTER
// Single Access Point for All AI Operations: Routes Tasks to Gemini or GPT-5 Nano
// ============================================================================

import { AI_TASK_TYPES, getAIProvider, getPreferredModel } from './taskTypes.mjs';
import { GeminiProvider, OpenAIProvider } from './providerAbstraction.mjs';
import { validateAssessmentQuestions, validateTeachingPlan } from './outputValidator.mjs';
import { logAIUsage } from './aiUsageLogger.mjs';

class AIRouter {
  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.openAIProvider = new OpenAIProvider();
    this.serverSupabase = null;
  }

  /**
   * Initializes router with server context
   */
  init({ serverSupabase = null, openAiApiKey = null, geminiApiKey = null, openAiModel = null } = {}) {
    this.serverSupabase = serverSupabase;
    this.geminiProvider = new GeminiProvider({
      apiKey: geminiApiKey || process.env.GEMINI_API_KEY,
      serverSupabase
    });
    this.openAIProvider = new OpenAIProvider({
      apiKey: openAiApiKey || process.env.OPENAI_API_KEY,
      model: openAiModel || process.env.OPENAI_MODEL || 'gpt-5-nano',
      serverSupabase
    });
  }

  /**
   * Central execution method for structured AI tasks.
   *
   * @param {object} params
   * @param {string} params.taskType - One of AI_TASK_TYPES
   * @param {string} params.prompt - Prompt instructions
   * @param {string} [params.systemPrompt] - System instructions
   * @param {object} [params.schema] - Optional JSON schema for structured outputs
   * @param {Function} [params.fallbackFactory] - Deterministic fallback generator
   * @param {boolean} [params.allowFallbackToGemini=false] - If true, permits exam downgrade to Gemini
   * @param {boolean} [params.allowFallbackToOpenAI=true] - If true, permits Gemini fallback to OpenAI
   * @param {boolean} [params.validateQuestions=false] - If true, enforces exam question quality
   * @param {object} [params.questionValidationOptions] - Options for question validator
   * @param {boolean} [params.validatePlan=false] - If true, enforces teaching plan quality
   */
  async executeTask({
    taskType,
    prompt,
    userPrompt,
    systemPrompt = '',
    schema = null,
    fallbackFactory = null,
    allowFallbackToGemini = false,
    allowFallbackToOpenAI = true,
    validateQuestions = false,
    questionValidationOptions = {},
    validatePlan = false,
    timeoutMs = 15000
  }) {
    const designatedProvider = getAIProvider(taskType);
    const preferredModel = getPreferredModel(designatedProvider, taskType);
    const startTime = Date.now();
    const effectivePrompt = prompt || userPrompt || '';

    let primaryResult = null;
    let fallbackUsed = false;
    let finalProvider = designatedProvider;
    let finalModel = preferredModel;

    // 1. TIER 2: PRIMARY OPENAI (GPT-5 NANO) ROUTE
    if (designatedProvider === 'openai') {
      try {
        if (!this.openAIProvider.isConfigured()) {
          throw new Error('OpenAIProvider is not configured on the server (missing OPENAI_API_KEY).');
        }

        primaryResult = await this.openAIProvider.generateStructured({
          prompt: effectivePrompt,
          systemPrompt,
          schema,
          taskType
        });

        finalProvider = 'openai';
        finalModel = primaryResult.model;
      } catch (openAiErr) {
        console.warn(`[AIRouter] OpenAI (${finalModel}) failed for task "${taskType}":`, openAiErr.message);

        // Check if fallback to Gemini is permitted for this task
        if (allowFallbackToGemini && this.geminiProvider.isConfigured()) {
          console.warn(`[AIRouter] Attempting permitted fallback to Gemini for task "${taskType}"...`);
          try {
            primaryResult = await this.geminiProvider.generateStructured({
              prompt: effectivePrompt,
              systemPrompt,
              schema,
              taskType,
              timeoutMs
            });
            fallbackUsed = true;
            finalProvider = 'gemini';
            finalModel = primaryResult.model;

            await logAIUsage(this.serverSupabase, {
              provider: 'gemini',
              model: primaryResult.model,
              taskType,
              latencyMs: Date.now() - startTime,
              success: true,
              fallbackUsed: true
            });
          } catch (gemFallbackErr) {
            console.warn('[AIRouter] Fallback to Gemini also failed:', gemFallbackErr.message);
          }
        }

        // If both failed or fallback not permitted
        if (!primaryResult) {
          if (fallbackFactory) {
            console.log(`[AIRouter] Using deterministic synthesis fallback for task "${taskType}"`);
            return {
              data: fallbackFactory(),
              metadata: {
                provider: 'fallback',
                model: 'deterministic_synthesis',
                taskType,
                fallbackUsed: true,
                latencyMs: Date.now() - startTime
              }
            };
          }
          throw openAiErr;
        }
      }
    } else {
      // 2. TIER 1: PRIMARY GEMINI ROUTE
      try {
        if (!this.geminiProvider.isConfigured()) {
          throw new Error('GeminiProvider is not configured on the server (missing GEMINI_API_KEY).');
        }

        primaryResult = await this.geminiProvider.generateStructured({
          prompt: effectivePrompt,
          systemPrompt,
          schema,
          taskType,
          timeoutMs
        });

        finalProvider = 'gemini';
        finalModel = primaryResult.model;
      } catch (geminiErr) {
        console.warn(`[AIRouter] Gemini failed for simple task "${taskType}":`, geminiErr.message);

        // Fallback to OpenAI if configured
        if (allowFallbackToOpenAI && this.openAIProvider.isConfigured()) {
          try {
            console.log(`[AIRouter] Falling back to OpenAI for task "${taskType}"`);
            primaryResult = await this.openAIProvider.generateStructured({
              prompt: effectivePrompt,
              systemPrompt,
              schema,
              taskType
            });
            fallbackUsed = true;
            finalProvider = 'openai';
            finalModel = primaryResult.model;

            await logAIUsage(this.serverSupabase, {
              provider: 'openai',
              model: primaryResult.model,
              taskType,
              latencyMs: Date.now() - startTime,
              success: true,
              fallbackUsed: true
            });
          } catch (openAiFallbackErr) {
            console.warn('[AIRouter] Fallback to OpenAI also failed:', openAiFallbackErr.message);
          }
        }

        if (!primaryResult) {
          if (fallbackFactory) {
            console.log(`[AIRouter] Using deterministic synthesis fallback for task "${taskType}"`);
            return {
              data: fallbackFactory(),
              metadata: {
                provider: 'fallback',
                model: 'deterministic_synthesis',
                taskType,
                fallbackUsed: true,
                latencyMs: Date.now() - startTime
              }
            };
          }
          throw geminiErr;
        }
      }
    }

    let outputData = primaryResult.data;

    // 3. QUALITY VALIDATION STEP
    if (validateQuestions && Array.isArray(outputData?.questions)) {
      const valResult = validateAssessmentQuestions(outputData.questions, questionValidationOptions);
      if (!valResult.isValid) {
        console.warn('[AIRouter Quality Warning] Question validation identified issues:', valResult.errors);
      }
      // Guarantee sanitized question output
      outputData = {
        ...outputData,
        questions: valResult.sanitizedQuestions
      };
    }

    if (validatePlan) {
      const planVal = validateTeachingPlan(outputData);
      if (!planVal.isValid) {
        console.warn('[AIRouter Quality Warning] Teaching Plan validation identified issues:', planVal.errors);
      }
    }

    return {
      success: true,
      data: outputData,
      parsed: outputData,
      provider: finalProvider,
      model: finalModel,
      metadata: {
        provider: finalProvider,
        model: finalModel,
        taskType,
        fallbackUsed,
        latencyMs: Date.now() - startTime,
        tokens: primaryResult.totalTokens || 0
      }
    };
  }

  /**
   * Central execution method for simple text generation tasks.
   */
  async executeTextTask({
    taskType,
    prompt,
    userPrompt,
    systemPrompt = '',
    fallbackFactory = null,
    timeoutMs = 15000
  }) {
    const designatedProvider = getAIProvider(taskType);
    const startTime = Date.now();
    const effectivePrompt = prompt || userPrompt || '';

    if (designatedProvider === 'openai') {
      try {
        const res = await this.openAIProvider.generateText({ prompt: effectivePrompt, systemPrompt, taskType });
        return {
          success: true,
          text: res.text,
          reply: res.text,
          provider: 'openai',
          model: res.model,
          metadata: {
            provider: 'openai',
            model: res.model,
            taskType,
            latencyMs: Date.now() - startTime
          }
        };
      } catch (err) {
        if (this.geminiProvider.isConfigured()) {
          const res = await this.geminiProvider.generateText({ prompt: effectivePrompt, systemPrompt, taskType, timeoutMs });
          return {
            success: true,
            text: res.text,
            reply: res.text,
            provider: 'gemini',
            model: res.model,
            metadata: {
              provider: 'gemini',
              model: res.model,
              taskType,
              fallbackUsed: true,
              latencyMs: Date.now() - startTime
            }
          };
        }
        if (fallbackFactory) return { success: true, text: fallbackFactory(), reply: fallbackFactory(), provider: 'fallback', model: 'deterministic', metadata: { provider: 'fallback', taskType } };
        throw err;
      }
    } else {
      try {
        const res = await this.geminiProvider.generateText({ prompt: effectivePrompt, systemPrompt, taskType, timeoutMs });
        return {
          success: true,
          text: res.text,
          reply: res.text,
          provider: 'gemini',
          model: res.model,
          metadata: {
            provider: 'gemini',
            model: res.model,
            taskType,
            latencyMs: Date.now() - startTime
          }
        };
      } catch (err) {
        if (this.openAIProvider.isConfigured()) {
          const res = await this.openAIProvider.generateText({ prompt: effectivePrompt, systemPrompt, taskType });
          return {
            success: true,
            text: res.text,
            reply: res.text,
            provider: 'openai',
            model: res.model,
            metadata: {
              provider: 'openai',
              model: res.model,
              taskType,
              fallbackUsed: true,
              latencyMs: Date.now() - startTime
            }
          };
        }
        if (fallbackFactory) return { success: true, text: fallbackFactory(), reply: fallbackFactory(), provider: 'fallback', model: 'deterministic', metadata: { provider: 'fallback', taskType } };
        throw err;
      }
    }
  }
}

export const aiRouter = new AIRouter();
export { AI_TASK_TYPES, getAIProvider };
