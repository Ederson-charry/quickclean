import type { CookieOptions } from "express";

/** Nombre y opciones de la cookie del refresh token (un único lugar). */
export const REFRESH_COOKIE = "rt";

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/auth",
};
