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
