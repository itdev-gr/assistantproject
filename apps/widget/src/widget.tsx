import { render } from 'preact';
import { Bubble } from './Bubble';

class GuestAssistantElement extends HTMLElement {
  connectedCallback() {
    const hotelSlug = this.getAttribute('data-hotel');
    const origin = this.getAttribute('data-origin') ?? window.location.origin;
    if (!hotelSlug) {
      console.warn('[aga-widget] missing data-hotel');
      return;
    }
    const shadow = this.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    shadow.appendChild(root);
    render(<Bubble hotelSlug={hotelSlug} origin={origin} />, root);
  }
}

if (!customElements.get('guest-assistant')) {
  customElements.define('guest-assistant', GuestAssistantElement);
}

// Auto-mount: read the script tag's data-hotel/data-origin and inject the element
(function autoMount() {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-hotel]');
  if (scripts.length === 0) return;
  const last = scripts[scripts.length - 1]!;
  const hotel = last.getAttribute('data-hotel');
  const origin = last.getAttribute('data-origin') ?? new URL(last.src).origin;
  if (!hotel) return;
  if (document.querySelector('guest-assistant')) return;
  const el = document.createElement('guest-assistant');
  el.setAttribute('data-hotel', hotel);
  el.setAttribute('data-origin', origin);
  document.body.appendChild(el);
})();
