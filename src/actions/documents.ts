'use server';

// TODO: implement server-side document operations (e.g. DB persistence via Mongoose models)

export async function addDocument(data: {
  id: string;
  type: string;
  label: string;
  uploadDate: string;
  note: string;
  fileName: string;
}) {
  // TODO
  return { ok: true };
}

export async function deleteDocument(id: string) {
  // TODO
  return { ok: true };
}
