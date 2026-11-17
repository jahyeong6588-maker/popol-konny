// Keep the published desktop application intact; load the mobile design only below its existing breakpoint.
const mobile = window.matchMedia('(max-width:720px)');
await import(mobile.matches ? './mobile-app.js' : './app.js');
mobile.addEventListener('change', () => window.location.reload());
