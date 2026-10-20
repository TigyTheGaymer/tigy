import { Component } from '@angular/core';

/** One long tapered stroke crossed by two shorter ones. */
@Component({
  selector: 'app-mark',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-flex;
      width: 1.05em;
      height: 1.05em;
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
        d="M12.6 1.5c.9 0 1.3 1.2 1.2 3.4l-.5 15.4c-.1 1.4-.5 2.2-1.2 2.2s-1-.8-1-2.2l-.3-15.4c0-2.2.6-3.4 1.8-3.4z"
      />
      <path
        d="M4.5 8.6c4.6-1.3 10.5-1.6 15.4-.7.9.2.9 1.1 0 1.2-4.9.6-10.4.9-15.2.8-1.2 0-1.3-1-.2-1.3z"
      />
      <path
        d="M6 14.1c3.9-1 8.8-1.2 12.8-.5.8.1.8 1 0 1.1-4 .5-8.6.7-12.6.6-1 0-1.1-.9-.2-1.2z"
      />
    </svg>
  `,
})
export class Mark {}
