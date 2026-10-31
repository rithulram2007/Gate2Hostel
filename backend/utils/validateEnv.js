/**
 * Production environment configuration validator
 * Enforces fail-fast startup if critical secrets or configs are missing.
 */
export const validateEnv = () => {
  const missing = [];

  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.trim() === '') {
    missing.push('JWT_ACCESS_SECRET');
  }

  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.trim() === '') {
    missing.push('JWT_REFRESH_SECRET');
  }

  if (missing.length > 0) {
    console.error(`[FATAL CONFIG ERROR] Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('Server cannot start safely without verified secrets. Exiting.');
    process.exit(1);
  }
};

export default validateEnv;
