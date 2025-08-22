/**
 * Security Configuration for Casa Pronósticos
 * Implements additional security measures to prevent phishing detection
 */

// Content Security Policy reporting (optional)
export const CSP_REPORT_URI = 'https://administracionpronosticos.web.app/csp-report';

// Trusted domains for Casa Pronósticos
export const TRUSTED_DOMAINS = [
  'administracionpronosticos.web.app',
  'administracionpronosticos.firebaseapp.com',
  'casapronosticos.gonzaloronzon.com', // Custom CNAME domain
  'casa-pronosticos.web.app' // Additional domain if needed
];

// Firebase specific trusted endpoints
export const FIREBASE_ENDPOINTS = [
  'firebaseio.com',
  'googleapis.com',
  'google.com',
  'gstatic.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com'
];

/**
 * Security headers validation
 */
export const validateSecurityHeaders = (): boolean => {
  try {
    // Check if we're running in a secure context
    if (typeof window !== 'undefined') {
      if (!window.isSecureContext) {
        return false;
      }

      // Verify CSP is working
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]') && 
          !document.querySelector('meta[http-equiv="X-Content-Security-Policy"]')) {
      }

      // Check for security headers
      const securityMeta = {
        'X-Frame-Options': document.querySelector('meta[http-equiv="X-Frame-Options"]'),
        'X-Content-Type-Options': document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
        'X-XSS-Protection': document.querySelector('meta[http-equiv="X-XSS-Protection"]')
      };

      Object.entries(securityMeta).forEach(([header, element]) => {
        if (!element) {
        }
      });
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Domain validation to prevent phishing
 */
export const validateDomain = (): boolean => {
  if (typeof window === 'undefined') return true;

  const currentDomain = window.location.hostname;
  
  // Check if current domain is in trusted list
  const isTrusted = TRUSTED_DOMAINS.some(domain => 
    currentDomain === domain || currentDomain.endsWith(`.${domain}`)
  );

  if (!isTrusted) {
    
    // In production, you might want to redirect to the official domain
    if (process.env.NODE_ENV === 'production') {
      window.location.href = `https://${TRUSTED_DOMAINS[0]}${window.location.pathname}`;
      return false;
    }
  }

  return isTrusted;
};

/**
 * Initialize security measures
 */
export const initSecurity = (): void => {
  try {
    // Validate security headers
    validateSecurityHeaders();
    
    // Validate domain
    validateDomain();

    // Disable console in production to prevent information leakage
    if (process.env.NODE_ENV === 'production') {
    }

    // Add integrity check for critical resources
    if (typeof window !== 'undefined') {
      // Prevent right-click context menu in production
      if (process.env.NODE_ENV === 'production') {
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent F12, Ctrl+Shift+I, Ctrl+U
        document.addEventListener('keydown', (e) => {
          if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u')
          ) {
            e.preventDefault();
            return false;
          }
        });
      }
    }

  } catch (error) {
  }
};

export default {
  CSP_REPORT_URI,
  TRUSTED_DOMAINS,
  FIREBASE_ENDPOINTS,
  validateSecurityHeaders,
  validateDomain,
  initSecurity
};
