/**
 * Time-based greeting utility for EdTechra-Bitz
 *
 * Rules (Local device time):
 * 05:00 - 11:59 -> "Good morning, {name}"
 * 12:00 - 16:59 -> "Good afternoon, {name}"
 * 17:00 - 20:59 -> "Good evening, {name}"
 * 21:00 - 04:59 -> "Good night, {name}"
 */

export function getTimeBasedGreeting(name?: string | null): string {
  const now = new Date();
  const hour = now.getHours();

  let greeting = 'Good day';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    greeting = 'Good evening';
  } else {
    // 21:00 to 04:59
    greeting = 'Good night';
  }

  const cleanName = name?.trim();
  if (cleanName) {
    return `${greeting}, ${cleanName}`;
  }

  return greeting;
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  // Split on spaces and take the first token unless it's a short initial like "R."
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && parts[0].length <= 2 && parts[0].endsWith('.')) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
}
