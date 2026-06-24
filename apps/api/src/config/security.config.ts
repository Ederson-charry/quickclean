export const security = {
  passwordMaxAgeDays: Number(process.env.PASSWORD_MAX_AGE_DAYS ?? 90),
  inactivityDisableDays: Number(process.env.INACTIVITY_DISABLE_DAYS ?? 90),
  passwordHistory: Number(process.env.PASSWORD_HISTORY ?? 5),
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS ?? 5),
  minPasswordLength: 12,
};
