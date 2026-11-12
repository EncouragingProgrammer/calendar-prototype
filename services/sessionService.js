import { createHash, timingSafeEqual } from 'node:crypto';

export function passwordMatches(password, expectedPassword) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(password), digest(expectedPassword));
}
