type UploadFile = { uri: string; name?: string; mimeType?: string };
type UploadOptions = {
  headers?: Record<string, string>;
  fields?: Record<string, string | number | boolean>;
  files?: Record<string, UploadFile>;
  signal?: AbortSignal;
};

export function fileNameFor(uri: string): string {
  const clean = uri.split('?')[0];
  return clean.split('/').pop() || 'file';
}

/** POST multipart/form-data (usato per caricare le foto delle carte). */
export async function uploadForm(url: string, opts: UploadOptions = {}): Promise<Response> {
  const form = new FormData();
  for (const [k, v] of Object.entries(opts.fields ?? {})) form.append(k, String(v));
  for (const [k, f] of Object.entries(opts.files ?? {})) {
    form.append(k, {
      uri: f.uri,
      name: f.name ?? fileNameFor(f.uri),
      type: f.mimeType ?? 'application/octet-stream',
    } as any);
  }
  return fetch(url, { method: 'POST', body: form, headers: opts.headers, signal: opts.signal });
}
