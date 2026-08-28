// ============================================================================
// EDTECHRA-BITZ: AI OCR Worksheet Grader Client Service
// ============================================================================

import { supabase } from '@/lib/supabase';
import { OCREvaluation, OCREvaluationCategory } from '@/types/classroom';

class OcrService {
  private async getAuthToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * 1. Presigns a temporary upload in Cloudflare R2
   */
  async presignTemporaryUpload(params: {
    classroomId: string;
    filename: string;
    contentType: string;
    size: number;
    evaluationId?: string;
  }): Promise<{
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
    evaluationId: string;
  }> {
    const token = await this.getAuthToken();
    const res = await fetch('/api/classes/ocr/presign-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to initialize temporary upload.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * 2. Uploads the raw file directly to Cloudflare R2 via presigned PUT
   */
  async uploadFileToR2(uploadUrl: string, file: File | Blob, contentType: string): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!res.ok) {
      throw new Error(`Upload to storage failed (status ${res.status})`);
    }
  }

  /**
   * 3. Submits an AI OCR evaluation job (direct base64 or temporary storage)
   */
  async submitJob(payload: {
    evaluationId: string;
    classroomId: string;
    studentId: string;
    category: OCREvaluationCategory;
    maxMarks?: number;
    title?: string;
    temporaryFileKey?: string;
    fileContentType?: string;
    studentName?: string;
    imageBase64?: string;
  }): Promise<{ jobId: string; evaluationId: string; status: string; [key: string]: any }> {
    const token = await this.getAuthToken();
    const res = await fetch('/api/classes/ocr-jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to submit AI evaluation job.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * 4. Polls job status until completed or failed
   */
  async pollJob(jobId: string): Promise<OCREvaluation> {
    const token = await this.getAuthToken();
    const res = await fetch(`/api/classes/ocr-jobs/${encodeURIComponent(jobId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to check job status.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * 5. Retrieves a signed URL for viewing/downloading the PDF report
   */
  async getReportUrl(evaluationId: string): Promise<string> {
    const token = await this.getAuthToken();
    const res = await fetch(`/api/classes/ocr-evaluations/${encodeURIComponent(evaluationId)}/report-url`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to load report URL.');
    }

    const json = await res.json();
    return json.data?.reportUrl || json.data?.publicUrl;
  }

  /**
   * 6. Teacher score & feedback adjustment
   */
  async updateEvaluation(evaluationId: string, updates: {
    score?: number;
    feedback?: string;
  }): Promise<OCREvaluation> {
    const token = await this.getAuthToken();
    const res = await fetch(`/api/classes/ocr-evaluations/${encodeURIComponent(evaluationId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update evaluation.');
    }

    const json = await res.json();
    return json.data;
  }

  /**
   * 7. Fetches evaluations history for a classroom / student
   */
  async getClassroomEvaluations(classroomId: string, studentId?: string): Promise<OCREvaluation[]> {
    const token = await this.getAuthToken();
    const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const res = await fetch(`/api/classes/${encodeURIComponent(classroomId)}/ocr-evaluations${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data || [];
  }
}

export const ocrService = new OcrService();
