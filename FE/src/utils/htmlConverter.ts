/**
 * HTML to React Converter Utilities
 * Helps convert HTML elements to React components
 */

/**
 * Common patterns found in the HTML pages
 */
export const commonPatterns = {
  // Navigation patterns
  sidebarNav: /<aside[^>]*class="[^"]*sidebar[^"]*"[^>]*>([\s\S]*?)<\/aside>/gi,
  navItems: /<a[^>]*class="[^"]*flex[^"]*items-center[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
  
  // Card/Panel patterns
  glassPanel: /<div[^>]*class="[^"]*glass-panel[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  card: /<div[^>]*class="[^"]*border[^"]*rounded[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  
  // Form patterns
  formInput: /<input[^>]*type="([^"]*)"[^>]*\/>/gi,
  formLabel: /<label[^>]*>([\s\S]*?)<\/label>/gi,
  formGroup: /<div[^>]*class="[^"]*space-y[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  
  // Button patterns
  buttons: /<button[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/button>/gi,
  
  // Icon patterns
  icons: /<span[^>]*class="[^"]*material-symbols[^"]*"[^>]*>([^<]*)<\/span>/gi,
  
  // Layout patterns
  mainContainer: /<main[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/main>/gi,
  flexContainer: /<div[^>]*class="[^"]*flex[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
}

/**
 * Extract Tailwind classes from HTML element
 */
export const extractTailwindClasses = (htmlString: string): string => {
  const classMatch = htmlString.match(/class="([^"]*)"/)
  return classMatch ? classMatch[1] : ''
}

/**
 * Extract text content from HTML
 */
export const extractTextContent = (htmlString: string): string => {
  return htmlString
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * Check if content is likely a form
 */
export const isFormLikely = (htmlString: string): boolean => {
  return /<input|<textarea|<select|<form/.test(htmlString)
}

/**
 * Check if content is likely a navigation
 */
export const isNavLikely = (htmlString: string): boolean => {
  return /<nav|<aside|class=".*sidebar|class=".*navbar/.test(htmlString)
}

/**
 * Check if content is likely a card/panel
 */
export const isCardLikely = (htmlString: string): boolean => {
  return /class=".*rounded|class=".*border|class=".*bg-|class=".*glass/.test(htmlString)
}
