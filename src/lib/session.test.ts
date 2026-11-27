import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, displayName, getUser, homeFor, isLoggedIn, normalizeRole, saveSession } from "@/lib/session";

describe("session", () => {
  beforeEach(() => sessionStorage.clear());

  it("maps legacy role names", () => {
    expect(normalizeRole("super_admin")).toBe("admin");
    expect(normalizeRole("officer")).toBe("college_admin");
    expect(normalizeRole("something-else")).toBe("student");
  });

  it("saves, reads and clears the session, including legacy keys", () => {
    sessionStorage.setItem("token", "old");
    saveSession("t", { id: "1", name: "Asha", role: "officer" });
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(isLoggedIn()).toBe(true);
    expect(getUser()).toEqual({ id: "1", name: "Asha", role: "college_admin" });
    clearSession();
    expect(isLoggedIn()).toBe(false);
  });

  it("routes each role to its home", () => {
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("college_admin")).toBe("/college");
    expect(homeFor("student")).toBe("/dashboard");
  });

  it("title-cases names for speech", () => {
    expect(displayName("ADITYA CHOUKSEY")).toBe("Aditya Chouksey");
    expect(displayName(null)).toBe("there");
  });
});
