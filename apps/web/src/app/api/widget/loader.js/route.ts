import { NextResponse } from 'next/server';

const LOADER_JS = `(function(){
  var s = document.currentScript;
  var hotel = s && s.getAttribute('data-hotel');
  if (!hotel) return console.warn('[aga-widget] missing data-hotel');
  var lang = (document.documentElement.lang || 'el').slice(0,2);
  var locale = lang === 'en' ? 'en' : 'el';
  var origin = new URL(s.src).origin;
  var script = document.createElement('script');
  script.type = 'module';
  script.src = origin + '/widget/v1/widget.' + locale + '.iife.js';
  script.setAttribute('data-hotel', hotel);
  script.setAttribute('data-origin', origin);
  document.head.appendChild(script);
})();`;

export const runtime = 'edge';

export async function GET() {
  return new NextResponse(LOADER_JS, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  });
}
