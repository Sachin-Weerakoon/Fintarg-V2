export async function getAnalysisPDF(_params: { month?: string }): Promise<Blob> {
  return new Blob(['Analysis PDF placeholder'], { type: 'application/pdf' });
}
