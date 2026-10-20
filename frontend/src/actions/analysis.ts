export async function getAnalysisPDF(_params?: { month?: string }): Promise<Blob> {
  void _params;
  return new Blob(['Analysis PDF placeholder'], { type: 'application/pdf' });
}
