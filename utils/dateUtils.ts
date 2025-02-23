import { useLanguage } from '@/contexts/LanguageContext';

export function getRelativeTime(dateString: string, t: (key: string) => string, language: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // If less than 30 seconds
  if (seconds < 30) {
    return t('time.now');
  }

  // If less than 24 hours, show relative time
  if (seconds < 86400) { // 24 hours in seconds
    if (seconds < 3600) { // Less than 1 hour
      const minutes = Math.floor(seconds / 60);
      if (minutes === 0) {
        return t('time.seconds').replace('{n}', seconds.toString());
      }
      return t('time.minutes').replace('{n}', minutes.toString());
    } else {
      const hours = Math.floor(seconds / 3600);
      return t('time.hours').replace('{n}', hours.toString());
    }
  }

  // If more than 24 hours, show the date
  return date.toLocaleDateString(language);
}