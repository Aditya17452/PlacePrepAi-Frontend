import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { generateShortlist, type ShortlistCandidate } from "@/services/api";

export function useShortlist() {
  const [candidates, setCandidates] = useState<ShortlistCandidate[]>([]);

  const mutation = useMutation({
    mutationFn: generateShortlist,
    onSuccess: (data) => setCandidates(data),
  });

  return {
    candidates,
    generate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

