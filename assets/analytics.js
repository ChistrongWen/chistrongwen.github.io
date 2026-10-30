/* Chistrong Wen | site-wide privacy-conscious analytics configuration.
   1. Create a private website in https://cloud.umami.is/
   2. Paste its Website ID below. Keep this ID public; NEVER put an API key here.
   3. The tracker is disabled until a real UUID is entered.
*/
(function () {
  'use strict';
  const WEBSITE_ID = 'PASTE_YOUR_UMAMI_WEBSITE_ID_HERE';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(WEBSITE_ID)) {
    return; // Not configured yet; website works normally.
  }
  // Avoid counting website previews opened directly from a local file.
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.setAttribute('data-website-id', WEBSITE_ID);
  script.setAttribute('data-domains', 'chistrongwen.github.io');
  document.head.appendChild(script);
})();
