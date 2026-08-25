import assert from "node:assert/strict";
import test from "node:test";

import {
  errorCategory,
  safeOperationFailure,
} from "./auth-anonymous-bootstrap.test.mjs";

test("converts a rejected provider error into a stable token-safe failure", () => {
  const providerError = Object.assign(
    new Error("Bearer eyJ.provider-message-must-not-be-printed"),
    { status: 503 },
  );

  const failure = safeOperationFailure("profiles_select", providerError);

  assert.equal(failure.message, "profiles_select: http_503");
  assert.equal(failure.message.includes("Bearer"), false);
  assert.equal(failure.message.includes("eyJ."), false);
});

test("uses a stable fallback category when a rejection has no HTTP status", () => {
  const failure = safeOperationFailure(
    "anonymous_sign_in",
    new Error("network detail must stay private"),
  );

  assert.equal(errorCategory(new Error("network detail must stay private")), "auth");
  assert.equal(failure.message, "anonymous_sign_in: auth");
});
