import { Component } from '@angular/core';

/** A band of tapered strokes entering from both page edges. */
@Component({
  selector: 'app-stripes',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      position: relative;
      display: block;
      height: clamp(56px, 8vw, 96px);
      margin: clamp(10px, 2vw, 20px) 0 clamp(4px, 1vw, 10px);
      overflow: hidden;
      pointer-events: none;
    }
    svg {
      position: absolute;
      height: auto;
      fill: var(--stripe);
    }
  `,
  template: `
    @for (stripe of stripes; track $index) {
      <svg viewBox="0 0 200 18" focusable="false" [style]="stripe">
        <path d="M0 9 C 40 2, 120 0, 200 7 C 120 13, 40 16, 0 9 Z" />
      </svg>
    }
  `,
})
export class Stripes {
  protected readonly stripes = [
    'left:-2%;top:6%;width:min(34%,420px);transform:rotate(4deg)',
    'left:-3%;top:44%;width:min(24%,300px);transform:rotate(-3deg)',
    'left:-1%;top:76%;width:min(15%,190px);transform:rotate(6deg)',
    'right:-2%;top:14%;width:min(28%,360px);transform:scaleX(-1) rotate(5deg)',
    'right:-3%;top:52%;width:min(38%,460px);transform:scaleX(-1) rotate(-4deg)',
    'right:-1%;top:84%;width:min(18%,220px);transform:scaleX(-1) rotate(3deg)',
  ];
}
