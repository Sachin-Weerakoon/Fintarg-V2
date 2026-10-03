'use server';

// TODO: implement server-side medical operations (e.g. DB persistence via Mongoose models)

export async function addMedicalExpense(data: {
  id: string;
  date: string;
  type: string;
  amount: number;
  note: string;
}) {
  // TODO
  return { ok: true };
}

export async function deleteMedicalExpense(id: string) {
  // TODO
  return { ok: true };
}
