// ============================================================================
// EDTECHRA AI USAGE & TOKEN CONSUMPTION LOGGER
// Economical Audit Trail & Real-time Prepaid Cost Monitoring for OpenAI & Gemini
// ============================================================================

// Standard pricing per 1M tokens (USD)
const TOKEN_PRICING = {
  'gpt-5-nano': { inputPerM: 0.05, outputPerM: 0.20 },
  'gpt-4.1-nano': { inputPerM: 0.10, outputPerM: 0.40 },
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.60 },
  'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30 },
  'gemini-1.5-flash': { inputPerM: 0.075, outputPerM: 0.30 }
};

// In-memory ring buffer (up to 1,000 logs)
const MAX_BUFFER_SIZE = 1000;
const memoryUsageLogs = [];

/**
 * Calculates estimated USD cost from token usage.
 */
export function calculateEstimatedCost(model, inputTokens = 0, outputTokens = 0) {
  const normModel = (model || '').toLowerCase();
  let rates = TOKEN_PRICING['gpt-5-nano']; // Default for nano

  for (const [mKey, r] of Object.entries(TOKEN_PRICING)) {
    if (normModel.includes(mKey)) {
      rates = r;
      break;
    }
  }

  const inputCost = (inputTokens / 1_000_000) * rates.inputPerM;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPerM;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Logs an AI provider request.
 */
export async function logAIUsage(serverSupabaseOrPayload, maybePayload) {
  let serverSupabase = null;
  let payload = {};

  if (maybePayload) {
    serverSupabase = serverSupabaseOrPayload;
    payload = maybePayload || {};
  } else if (serverSupabaseOrPayload && typeof serverSupabaseOrPayload === 'object') {
    if (serverSupabaseOrPayload.from && typeof serverSupabaseOrPayload.from === 'function') {
      serverSupabase = serverSupabaseOrPayload;
    } else {
      payload = serverSupabaseOrPayload;
    }
  }

  const {
    provider,
    model,
    taskType,
    promptTokens = 0,
    completionTokens = 0,
    inputTokens = 0,
    outputTokens = 0,
    reasoningTokens = 0,
    totalTokens = 0,
    latencyMs = 0,
    success = true,
    fallbackUsed = false,
    error = null
  } = payload;

  const effInputTokens = inputTokens || promptTokens || 0;
  const effOutputTokens = outputTokens || completionTokens || 0;
  const calculatedTotal = totalTokens || (effInputTokens + effOutputTokens);
  const estimatedCost = calculateEstimatedCost(model, effInputTokens, effOutputTokens);

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: provider || 'unknown',
    model: model || 'unknown',
    task_type: taskType || 'general',
    taskType: taskType || 'general',
    input_tokens: Number(effInputTokens) || 0,
    promptTokens: Number(effInputTokens) || 0,
    output_tokens: Number(effOutputTokens) || 0,
    completionTokens: Number(effOutputTokens) || 0,
    reasoning_tokens: Number(reasoningTokens) || 0,
    reasoningTokens: Number(reasoningTokens) || 0,
    total_tokens: Number(calculatedTotal) || 0,
    totalTokens: Number(calculatedTotal) || 0,
    estimated_cost_usd: estimatedCost,
    estimatedCostUSD: estimatedCost,
    latency_ms: Math.round(latencyMs) || 0,
    latencyMs: Math.round(latencyMs) || 0,
    success: Boolean(success),
    fallback_used: Boolean(fallbackUsed),
    fallbackUsed: Boolean(fallbackUsed),
    error_message: error ? String(error).slice(0, 300) : null,
    error: error ? String(error).slice(0, 300) : null,
    created_at: new Date().toISOString()
  };

  // Add to memory ring buffer
  memoryUsageLogs.unshift(logEntry);
  if (memoryUsageLogs.length > MAX_BUFFER_SIZE) {
    memoryUsageLogs.pop();
  }

  // Attempt database persistence if table exists
  if (serverSupabase) {
    try {
      await serverSupabase
        .from('ai_usage_logs')
        .insert({
          provider: logEntry.provider,
          model: logEntry.model,
          task_type: logEntry.task_type,
          input_tokens: logEntry.input_tokens,
          output_tokens: logEntry.output_tokens,
          total_tokens: logEntry.total_tokens,
          estimated_cost_usd: logEntry.estimated_cost_usd,
          latency_ms: logEntry.latency_ms,
          success: logEntry.success,
          fallback_used: logEntry.fallback_used,
          error_message: logEntry.error_message
        });
    } catch {
      // Table may not exist yet; in-memory buffer handles audit reliably
    }
  }

  return logEntry;
}

/**
 * Computes aggregated statistics for the admin dashboard.
 */
export function getAIUsageSummary() {
  let geminiRequests = 0;
  let openAiRequests = 0;
  let gpt5NanoRequests = 0;
  let totalOpenAiTokens = 0;
  let totalOpenAiCostUsd = 0;
  let fallbackCount = 0;
  let errorCount = 0;
  const taskCounts = {};

  for (const log of memoryUsageLogs) {
    if (log.provider === 'gemini') {
      geminiRequests++;
    } else if (log.provider === 'openai') {
      openAiRequests++;
      totalOpenAiTokens += log.total_tokens;
      totalOpenAiCostUsd += log.estimated_cost_usd;

      if ((log.model || '').includes('nano')) {
        gpt5NanoRequests++;
      }
    }

    if (log.fallback_used) fallbackCount++;
    if (!log.success) errorCount++;

    const t = log.task_type || 'unclassified';
    taskCounts[t] = (taskCounts[t] || 0) + 1;
  }

  const totalRequests = memoryUsageLogs.length;
  const avgLatency = totalRequests > 0
    ? Math.round(memoryUsageLogs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / totalRequests)
    : 0;

  return {
    total_requests: totalRequests,
    totalRequests,
    gemini_requests: geminiRequests,
    openai_requests: openAiRequests,
    gpt5_nano_requests: gpt5NanoRequests,
    providerBreakdown: {
      openai: openAiRequests,
      gemini: geminiRequests,
      fallback: fallbackCount
    },
    tokenTotals: {
      promptTokens: memoryUsageLogs.reduce((acc, l) => acc + (l.input_tokens || 0), 0),
      completionTokens: memoryUsageLogs.reduce((acc, l) => acc + (l.output_tokens || 0), 0),
      reasoningTokens: memoryUsageLogs.reduce((acc, l) => acc + (l.reasoning_tokens || 0), 0),
      totalTokens: totalOpenAiTokens
    },
    estimatedCostUSD: {
      openai: totalOpenAiCostUsd.toFixed(4),
      gemini: '0.0000',
      total: totalOpenAiCostUsd.toFixed(4)
    },
    total_openai_tokens: totalOpenAiTokens,
    estimated_openai_cost_usd: Number(totalOpenAiCostUsd.toFixed(4)),
    fallback_count: fallbackCount,
    fallbackCount,
    error_count: errorCount,
    errorCount,
    averageLatencyMs: avgLatency,
    tasks_breakdown: taskCounts,
    recent_logs: memoryUsageLogs.slice(0, 50)
  };
}

/**
 * Resets the in-memory usage log buffer (primarily for testing).
 */
export function resetAIUsageLogs() {
  memoryUsageLogs.length = 0;
}

export const aiUsageLogger = {
  log: (payload) => logAIUsage(null, payload),
  getSummary: getAIUsageSummary,
  getRecentLogs: (limit = 50) => memoryUsageLogs.slice(0, limit),
  reset: resetAIUsageLogs
};
