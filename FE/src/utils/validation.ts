// Form validation utilities
export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
    message: 'Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character (!@#$%^&*)',
  },
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username can only contain alphanumeric characters, underscores, and hyphens',
  },
  slug: {
    pattern: /^[a-z0-9-]+$/,
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  },
  url: {
    pattern: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    message: 'Please enter a valid URL',
  },
  phone: {
    pattern: /^[\d\s\-+()]+$/,
    message: 'Please enter a valid phone number',
  },
  zipCode: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'Please enter a valid zip code',
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

type ValidationRuleSet = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (val: string) => string | null;
}

export const validateField = (
  fieldName: string,
  value: string,
  rules?: ValidationRuleSet
): ValidationError | null => {
  if (rules?.required && !value) {
    return { field: fieldName, message: `${fieldName} is required` };
  }

  if (!value) return null;

  if (rules?.minLength && value.length < rules.minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${rules.minLength} characters` };
  }

  if (rules?.maxLength && value.length > rules.maxLength) {
    return { field: fieldName, message: `${fieldName} cannot exceed ${rules.maxLength} characters` };
  }

  if (rules?.pattern && !rules.pattern.test(value)) {
    return { field: fieldName, message: `${fieldName} format is invalid` };
  }

  if (rules?.custom) {
    const customError = rules.custom(value);
    if (customError) return { field: fieldName, message: customError };
  }

  return null;
};

export const validateForm = (
  formData: Record<string, string>,
  validationSchema: Record<string, ValidationRuleSet>
): FormValidationResult => {
  const errors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const error = validateField(fieldName, formData[fieldName], rules);
    if (error) errors.push(error);
  }

  return { isValid: errors.length === 0, errors };
};

export const checkPasswordStrength = (password: string): {
  score: number;
  message: string;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
} => {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]+/.test(password)) score++;
  if (/[A-Z]+/.test(password)) score++;
  if (/[0-9]+/.test(password)) score++;
  if (/[$@#&!]+/.test(password)) score++;

  const strengthMap = ['weak', 'fair', 'good', 'strong', 'very-strong'] as const;
  const messageMap = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return {
    score: Math.min(score, 4),
    message: messageMap[score] || 'Too weak',
    strength: strengthMap[Math.min(score, 4)],
  };
};

export const isValidEmail = (email: string): boolean => ValidationRules.email.pattern.test(email);

export const isValidUsername = (username: string): boolean => {
  if (username.length < ValidationRules.username.minLength || username.length > ValidationRules.username.maxLength) {
    return false;
  }
  return ValidationRules.username.pattern.test(username);
};
