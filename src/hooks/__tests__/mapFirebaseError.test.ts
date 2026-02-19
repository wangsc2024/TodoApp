// @vitest-environment jsdom
import { mapFirebaseError } from "../useAuth";

describe("mapFirebaseError", () => {
  const knownCodes: [string, string][] = [
    ["auth/email-already-in-use", "此電子郵件已被註冊。"],
    ["auth/invalid-email", "無效的電子郵件地址。"],
    ["auth/weak-password", "密碼至少需要 6 個字元。"],
    ["auth/user-not-found", "找不到此電子郵件的帳號。"],
    ["auth/wrong-password", "密碼錯誤。"],
    ["auth/invalid-credential", "電子郵件或密碼錯誤。"],
    ["auth/too-many-requests", "嘗試次數過多，請稍後再試。"],
    ["auth/requires-recent-login", "此操作需要重新登入，請登出後再次登入。"],
  ];

  it.each(knownCodes)("maps %s to the correct Chinese message", (code, expected) => {
    expect(mapFirebaseError(code)).toBe(expected);
  });

  it("returns default message for unknown error codes", () => {
    expect(mapFirebaseError("auth/unknown-error")).toBe("認證失敗，請再試一次。");
    expect(mapFirebaseError("")).toBe("認證失敗，請再試一次。");
    expect(mapFirebaseError("some/random-code")).toBe("認證失敗，請再試一次。");
  });

  it("returns a non-empty string for all mapped codes", () => {
    knownCodes.forEach(([code]) => {
      const result = mapFirebaseError(code);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
