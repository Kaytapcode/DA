// Form validation utilities
export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 6,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must contain at least 6 characters, including uppercase, lowercase, and numbers',
    hasSpecialChar: /[$@#&!]/,
    specialCharMessage: 'Consider adding special characters ($@#&!) for stronger security',
  },
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username can only contain alphanumeric characters, underscores, and hyphens',
  },
  slug: {
    pattern: /^[a-z0-9\-]+$/,
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  },
  url: {
    pattern: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    message: 'Please enter a valid URL',
  },
  phone: {
    pattern: /^[\d\s\-\+\(\)]+$/,
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

export const validateField = (
  fieldName: string,
  value: any,
  rules?: { required?: boolean; minLength?: number; maxLength?: number; pattern?: RegExp; custom?: (val: any) => string | null }
): ValidationError | null => {
  // Check if field is required and empty
  if (rules?.required && !value) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
    };
  }

  // Skip validation if value is empty and not required
  if (!value) return null;

  // Check minimum length
  if (rules?.minLength && value.length < rules.minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${rules.minLength} characters`,
    };
  }

  // Check maximum length
  if (rules?.maxLength && value.length > rules.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} cannot exceed ${rules.maxLength} characters`,
    };
  }

  // Check pattern
  if (rules?.pattern && !rules.pattern.test(value)) {
    return {
      field: fieldName,
      message: `${fieldName} format is invalid`,
    };
  }

  // Custom validation
  if (rules?.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return {
        field: fieldName,
        message: customError,
      };
    }
  }

  return null;
};

export const validateForm = (
  formData: Record<string, any>,
  validationSchema: Record<string, any>
): FormValidationResult => {
  const errors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const error = validateField(fieldName, formData[fieldName], rules);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number; // 0-4
  message: string;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
} => {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.match(/[a-z]+/)) score++;
  if (password.match(/[A-Z]+/)) score++;
  if (password.match(/[0-9]+/)) score++;
  if (password.match(/[$@#&!]+/)) score++;

  const strengthMap = ['weak', 'fair', 'good', 'strong', 'very-strong'] as const;
  const messageMap = [
    'Too weak',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ];

  return {
    score: Math.min(score, 4),
    message: messageMap[score] || 'Too weak',
    strength: strengthMap[Math.min(score, 4)],
  };
};

// Email verification
export const isValidEmail = (email: string): boolean => {
  return ValidationRules.email.pattern.test(email);
};

// Username validation
export const isValidUsername = (username: string): boolean => {
  if (username.length < ValidationRules.username.minLength || username.length > ValidationRules.username.maxLength) {
    return false;
  }
  return ValidationRules.username.pattern.test(username);
};
