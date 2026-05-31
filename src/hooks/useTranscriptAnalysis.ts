import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { analyzeTranscript, type TranscriptAnalysis } from "@/services/api";

export function useTranscriptAnalysis() {
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: analyzeTranscript,
    onSuccess: (data) => setAnalysis(data),
  });

  return {
    analysis,
    analyze: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

