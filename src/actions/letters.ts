'use server';

// TODO: implement server-side letter operations (e.g. DB persistence via Mongoose models)

export async function addLetter(data: {
  id: string;
  type: string;
  mode: string;
  date: string;
  addressedTo: string;
  purpose: string;
  body: string;
  companyId?: string;
}) {
  // TODO
  return { ok: true };
}

export async function deleteLetter(id: string) {
  // TODO
  return { ok: true };
}
