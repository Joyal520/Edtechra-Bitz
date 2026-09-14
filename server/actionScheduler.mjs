// ============================================================================
// EDTECHRA DIGITAL CLASSROOM: ACTION SCHEDULER (PHASE 2B)
// Autonomous server-side background worker executing approved & scheduled
// classroom actions without client-side or browser dependency.
// ============================================================================

import { executeAction, getDueActions } from './actionExecutionBus.mjs';

class ActionScheduler {
  constructor() {
    this.intervalHandle = null;
    this.serverSupabase = null;
    this.serverOpenAI = null;
    this.isProcessing = false;
    this.pollIntervalMs = 30000; // 30 seconds
  }

  /**
   * Initializes the scheduler with server context
   */
  init({ serverSupabase, serverOpenAI, pollIntervalMs = 30000 }) {
    this.serverSupabase = serverSupabase;
    this.serverOpenAI = serverOpenAI;
    this.pollIntervalMs = pollIntervalMs;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }

    console.log(`[ActionScheduler] Initialized with poll interval ${this.pollIntervalMs}ms`);
    this.intervalHandle = setInterval(() => this.processDueActions(), this.pollIntervalMs);

    // Run first tick after a short warm-up delay (5s)
    setTimeout(() => this.processDueActions(), 5000);
  }

  /**
   * Stops the background worker
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[ActionScheduler] Stopped background worker');
    }
  }

  /**
   * Main worker loop tick
   */
  async processDueActions() {
    if (this.isProcessing) {
      return; // Previous batch still running
    }

    this.isProcessing = true;

    try {
      const nowIso = new Date().toISOString();
      const dueActions = await getDueActions(this.serverSupabase, nowIso);

      if (dueActions.length > 0) {
        console.log(`[ActionScheduler] Found ${dueActions.length} actions due for execution`);

        for (const action of dueActions) {
          try {
            console.log(`[ActionScheduler] Executing action ${action.id} (${action.action_type}: "${action.title}")`);
            await executeAction(this.serverSupabase, action.id, {
              forceImmediate: true,
              serverOpenAI: this.serverOpenAI
            });
            console.log(`[ActionScheduler] Successfully executed action ${action.id}`);
          } catch (execErr) {
            console.error(`[ActionScheduler] Failed executing action ${action.id}:`, execErr.message);
          }
        }
      }
    } catch (tickErr) {
      console.error('[ActionScheduler] Tick error:', tickErr);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const actionScheduler = new ActionScheduler();
