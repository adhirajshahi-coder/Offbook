import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeAll(() => {
  process.env.STUDENT_SESSION_SECRET = "test-secret-that-is-at-least-32-characters";
});

const PARENT = "11111111-1111-1111-1111-111111111111";
const OTHER_PARENT = "22222222-2222-2222-2222-222222222222";
const STUDENT = "33333333-3333-3333-3333-333333333333";

describe("student session token", async () => {
  const { encodeStudentToken, decodeStudentToken } = await import("./student-session");

  it("round-trips for the same parent", () => {
    const token = encodeStudentToken(PARENT, STUDENT);
    expect(decodeStudentToken(token, PARENT)).toBe(STUDENT);
  });

  it("is rejected for a different parent account", () => {
    const token = encodeStudentToken(PARENT, STUDENT);
    expect(decodeStudentToken(token, OTHER_PARENT)).toBeNull();
  });

  it("is rejected when tampered with", () => {
    const token = encodeStudentToken(PARENT, STUDENT);
    const forged = token.replace(STUDENT, "44444444-4444-4444-4444-444444444444");
    expect(decodeStudentToken(forged, PARENT)).toBeNull();
  });

  it("expires after 12 hours", () => {
    const issued = Date.now() - 13 * 60 * 60 * 1000;
    const token = encodeStudentToken(PARENT, STUDENT, issued);
    expect(decodeStudentToken(token, PARENT)).toBeNull();
  });
});
