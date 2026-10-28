// Talking to the Godspeed API. Pure: the HTTP call is handed in, so tests need no network.

import type { TaskBody } from './task.ts';

export const GODSPEED_TASKS_URL = 'https://api.godspeedapp.com/tasks';

export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponse {
  status: number;
  text: string;
}

export type RequestFn = (request: HttpRequest) => Promise<HttpResponse>;

/** The API's own message when it gave one, else `HTTP <status>: <body>`. */
export function describeFailure(status: number, text: string): string {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return `HTTP ${status}: ${text}`;
  }
  const fields = (json && typeof json === 'object' ? json : {}) as { message?: unknown; error?: unknown };
  const reason = [fields.message, fields.error].find((value) => typeof value === 'string' && value !== '');
  return typeof reason === 'string' ? reason : `HTTP ${status}`;
}

/** Creates one task; throws an Error with a readable message when the API refuses it. */
export async function createTask(request: RequestFn, apiKey: string, body: TaskBody): Promise<void> {
  const response = await request({
    url: GODSPEED_TASKS_URL,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // The task already exists once the API answers 2xx; a body we cannot read is not a failure.
  if (response.status >= 400) {
    throw new Error(describeFailure(response.status, response.text));
  }
}

export interface SendResult {
  /** What to call the note in a message. */
  name: string;
  error?: Error;
}

export interface Report {
  type: 'success' | 'error';
  message: string;
  duration: number;
}

const SUCCESS_MS = 3000;
const ERROR_MS = 10000;

/** The messages to show after sending: all sent, all failed (one each), or a mix. */
export function summarizeResults(results: SendResult[]): Report[] {
  if (results.length === 0) return [];

  const failed = results.filter((result) => result.error);
  const sent = results.length - failed.length;
  const reports: Report[] = [];

  if (sent > 0) {
    reports.push({
      type: 'success',
      message: results.length === 1 ? 'Sent successfully' : `${sent} of ${results.length} notes sent successfully`,
      duration: SUCCESS_MS,
    });
  }
  for (const result of failed) {
    reports.push({
      type: 'error',
      message: `Failed to send "${result.name}": ${result.error?.message}`,
      duration: ERROR_MS,
    });
  }
  if (failed.length === 0 && results.length > 1) {
    reports[0].message = `${results.length} notes sent successfully`;
  }
  return reports;
}
