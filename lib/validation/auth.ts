import * as z from "zod";

export const NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

// Trim and lowercase first, then check the result. Postgres treats "A@x.com"
// and "a@x.com" as different values, so we store one canonical form.
const email = z
  .string({ error: "Enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, "Enter a valid email address.")
  .pipe(z.email("Enter a valid email address."));

const name = z
  .string({ error: "Enter your name." })
  .trim()
  .min(1, "Enter your name.")
  .max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or fewer.`);

// Passwords are never trimmed: a leading or trailing space can be part of one.
const newPassword = z
  .string({ error: "Enter a password." })
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`,
  );

// z.object() drops any field not listed here, so a hand-made request that adds
// something like role=ADMIN is ignored instead of passed along.
export const signupSchema = z.object({
  name,
  email,
  password: newPassword,
});

// Login only checks that both fields look usable. It does not repeat the
// sign-up rules, so a failed login never hints at what a valid password is.
export const LOGIN_ERROR = "Invalid email or password.";

export const loginSchema = z.object({
  email: z
    .string({ error: LOGIN_ERROR })
    .trim()
    .toLowerCase()
    .min(1, LOGIN_ERROR),
  password: z
    .string({ error: LOGIN_ERROR })
    .min(1, LOGIN_ERROR)
    .max(PASSWORD_MAX_LENGTH, LOGIN_ERROR),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
