type TranslationFunction = (key: string) => string;

export const getAuthErrorMessage = (error: any, t: TranslationFunction): string => {
  if (!error) return '';

  const errorMessage = error.message?.toLowerCase() || '';

  if (errorMessage.includes('invalid login credentials')) {
    return t('auth.error.invalidLogin');
  }

  if (errorMessage.includes('email already in use') || 
      errorMessage.includes('already exists')) {
    return t('auth.error.emailInUse');
  }

  if (errorMessage.includes('weak password')) {
    return t('auth.error.weakPassword');
  }

  if (errorMessage.includes('invalid email')) {
    return t('auth.error.invalidEmail');
  }

  if (errorMessage.includes('missing') || 
      errorMessage.includes('required')) {
    return t('auth.error.missingFields');
  }

  return t('auth.error.generic');
};
