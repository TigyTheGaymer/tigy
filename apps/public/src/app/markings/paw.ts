import { Component } from '@angular/core';

@Component({
  selector: 'app-paw',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-flex;
      width: 1.2em;
      height: 1.2em;
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
  `,
  template: `
    <svg viewBox="0 0 24 24" focusable="false">
      <path
        d="M12 12.6c-3.1 0-6.3 3.4-6.3 5.9 0 1.9 1.5 2.6 3.1 2.6 1.3 0 2.1-.7 3.2-.7s1.9.7 3.2.7c1.6 0 3.1-.7 3.1-2.6 0-2.5-3.2-5.9-6.3-5.9z"
      />
      <ellipse cx="4.6" cy="10.4" rx="1.9" ry="2.5" transform="rotate(-22 4.6 10.4)" />
      <ellipse cx="9" cy="6.2" rx="2" ry="2.7" transform="rotate(-8 9 6.2)" />
      <ellipse cx="15" cy="6.2" rx="2" ry="2.7" transform="rotate(8 15 6.2)" />
      <ellipse cx="19.4" cy="10.4" rx="1.9" ry="2.5" transform="rotate(22 19.4 10.4)" />
    </svg>
  `,
})
export class Paw {}
