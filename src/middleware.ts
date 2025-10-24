
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['pt', 'en'],
 
  // Used when no locale matches
  defaultLocale: 'pt',

  // The prefix is always used, except for the root landing page.
  localePrefix: 'always',
});
 
export const config = {
  // Match only internationalized pathnames
  // This skips the root `/` and any other paths you want to exclude
  matcher: ['/', '/(pt|en)/:path*']
};
