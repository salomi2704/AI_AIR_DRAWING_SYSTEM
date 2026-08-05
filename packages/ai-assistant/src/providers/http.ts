import { ProviderError } from './base';

export const DEFAULT_TIMEOUT_MS = 15000;

export async function postJson(
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ProviderError(
      `Request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 300);
    } catch {
      // body may already be consumed or unreadable
    }
    throw new ProviderError(`HTTP ${response.status} from ${url}: ${detail}`);
  }
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ProviderError(`Non-JSON response from ${url}`);
  }
}
