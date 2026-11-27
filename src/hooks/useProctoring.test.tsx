import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProctoring } from "@/hooks/useProctoring";
import * as api from "@/services/api";

describe("useProctoring", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("batches events and lets the server decide termination", async () => {
    const send = vi.spyOn(api, "sendProctoringBatch").mockResolvedValue({
      accepted: 2, terminate: true, terminate_reason: "No face was visible for 31 seconds.", warnings_issued: 1,
    });
    const onTerminate = vi.fn();
    const { result } = renderHook(() => useProctoring({ sessionId: "s1", enabled: true, onTerminate }));

    act(() => {
      result.current.report("tab_switch", 3);
      result.current.report("no_face", 9, { duration_ms: 31000 });
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(send).toHaveBeenCalledTimes(1);
    const [sessionId, events] = send.mock.calls[0];
    expect(sessionId).toBe("s1");
    expect(events.map((e) => e.type)).toEqual(["tab_switch", "no_face"]);
    expect(events[1].severity).toBe(5); // clamped to the server's 1..5 range
    expect(onTerminate).toHaveBeenCalledWith("No face was visible for 31 seconds.");
  });

  it("keeps events for the next attempt when sending fails", async () => {
    const send = vi.spyOn(api, "sendProctoringBatch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ accepted: 1, terminate: false, terminate_reason: null, warnings_issued: 0 });
    const { result } = renderHook(() => useProctoring({ sessionId: "s1", enabled: true, onTerminate: vi.fn() }));

    act(() => result.current.report("paste_attempt", 3));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1].map((e) => e.type)).toEqual(["paste_attempt"]);
  });

  it("sends nothing when disabled", async () => {
    const send = vi.spyOn(api, "sendProctoringBatch");
    const { result } = renderHook(() => useProctoring({ sessionId: "s1", enabled: false, onTerminate: vi.fn() }));
    act(() => result.current.report("tab_switch", 3));
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(send).not.toHaveBeenCalled();
  });
});
