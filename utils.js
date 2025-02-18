export function isProtectedPage(url) {
  const protectedPatterns = [
    /^chrome:\/\//i, // Chrome internal pages
    /^chrome-extension:\/\//i, // Extension pages
    /^devtools:\/\//i, // Developer tools
    /^view-source:\/\//i, // View source pages
    /^about:/i, // About pages
    /^edge:\/\//i, // Edge internal pages (for compatibility)
    /^brave:\/\//i, // Brave internal pages (for compatibility)
  ];

  return protectedPatterns.some((pattern) => pattern.test(url));
}
