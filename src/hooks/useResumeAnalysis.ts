import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { analyzeResume, matchResumeWithJDs, type ResumeAnalysis, type JDMatch } from "@/services/api";

export function useResumeAnalysis() {
  const [resumeData, setResumeData] = useState<ResumeAnalysis | null>(null);
  const [jdMatches, setJdMatches] = useState<JDMatch[]>([]);

  const analyzeMutation = useMutation({
    mutationFn: analyzeResume,
    onSuccess: (data) => setResumeData(data),
  });

  const matchMutation = useMutation({
    mutationFn: matchResumeWithJDs,
    onSuccess: (data) => setJdMatches(data),
  });

  const uploadAndAnalyze = async (file: File) => {
    const result = await analyzeMutation.mutateAsync(file);
    // After analysis, trigger JD matching (using a mock resumeId for now)
    await matchMutation.mutateAsync("resume_latest");
    return result;
  };

  return {
    resumeData,
    jdMatches,
    uploadAndAnalyze,
    isAnalyzing: analyzeMutation.isPending,
    isMatching: matchMutation.isPending,
    isLoading: analyzeMutation.isPending || matchMutation.isPending,
    error: analyzeMutation.error || matchMutation.error,
  };
}

