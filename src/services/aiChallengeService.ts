import { supabase } from '@/lib/supabase';
import {
  AiChallenge,
  AiChallengeSubmission,
  AiChallengeLeaderboardEntry
} from '@/types/aiChallenge';

class AiChallengeClientService {
  /**
   * Helper to get active user's access token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Uploads reference file or student submission file to R2 via presigned URL
   */
  async uploadFile(
    file: File,
    challengeId?: string,
    type: 'reference' | 'submission' = 'submission'
  ): Promise<{ fileKey?: string; error?: string; submissionId?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/classes/challenges/presign-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          challengeId,
          type
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to generate upload URL' };
      }

      const { uploadUrl, fileKey, submissionId } = json.data;

      // Upload binary to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (!uploadRes.ok) {
        return { error: 'Failed to upload file to storage.' };
      }

      return { fileKey, submissionId };
    } catch (err: any) {
      console.error('[AiChallenge] uploadFile error:', err);
      return { error: err.message || 'File upload error' };
    }
  }

  /**
   * Teacher creates a new AI Challenge
   */
  async createChallenge(payload: {
    classroomId: string;
    title: string;
    instructions: string;
    category?: string;
    maxMarks?: number;
    allowTextSubmission?: boolean;
    allowFileUpload?: boolean;
    referenceFileKey?: string | null;
    referenceFileName?: string | null;
    deadlineAt?: string | null;
  }): Promise<{ data?: AiChallenge; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/classes/challenges', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to create challenge' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Failed to create challenge' };
    }
  }

  /**
   * List challenges for classroom
   */
  async getChallenges(classroomId: string): Promise<AiChallenge[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/${classroomId}/challenges`, {
        headers
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch (err) {
      console.error('[AiChallenge] getChallenges error:', err);
      return [];
    }
  }

  /**
   * Get single challenge details
   */
  async getChallenge(challengeId: string): Promise<AiChallenge | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/${challengeId}`, {
        headers
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Student submits challenge response (text or uploaded file)
   */
  async submitWork(
    challengeId: string,
    payload: {
      submissionType: 'text' | 'file';
      contentText?: string;
      fileKey?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      submissionId?: string;
    }
  ): Promise<{ data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/${challengeId}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to submit work' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Network error submitting work' };
    }
  }

  /**
   * Student gets own submission and result
   */
  async getMySubmission(challengeId: string): Promise<AiChallengeSubmission | null> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/${challengeId}/my-submission`, {
        headers
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Teacher gets all student submissions for a challenge
   */
  async getSubmissions(challengeId: string): Promise<AiChallengeSubmission[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/${challengeId}/submissions`, {
        headers
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Teacher overrides/adjusts student score
   */
  async overrideScore(
    submissionId: string,
    finalScore: number,
    reason?: string
  ): Promise<{ data?: AiChallengeSubmission; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/submissions/${submissionId}/override-score`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ finalScore, reason })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: json.error || 'Failed to override score' };
      }

      return { data: json.data };
    } catch (err: any) {
      return { error: err.message || 'Error updating score' };
    }
  }

  /**
   * Get leaderboard for a challenge
   */
  async getLeaderboard(challengeId: string): Promise<AiChallengeLeaderboardEntry[]> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch(`/api/classes/challenges/${challengeId}/leaderboard`, {
        headers
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const aiChallengeService = new AiChallengeClientService();
