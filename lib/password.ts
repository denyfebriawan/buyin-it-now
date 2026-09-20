import { randomBytes } from "node:crypto";

import argon2 from "argon2";

// argon2.hash uses argon2id with the library's default cost settings. Every
// hash is a single string that also holds the algorithm, the settings and a
// fresh random salt, so nothing besides this string needs to be stored.
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

// Compares a login attempt against a stored hash. verify() reads the settings
// and salt out of the hash string, so old hashes keep working even if the
// default settings change later. It throws if the hash string is malformed.
export function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(hash, password);
}

// A hash of a throwaway random password that belongs to no account. Login
// verifies against it when the email is unknown, so an unknown email costs the
// same time as a wrong password. It is built with hashPassword() so it always
// has the same cost settings as real hashes, and the Promise is stored (not the
// finished string) so simultaneous first callers share one computation.
let dummyHash: Promise<string> | undefined;

export function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = hashPassword(randomBytes(32).toString("hex"));
  }
  return dummyHash;
}
