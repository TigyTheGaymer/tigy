import { Component, inject } from '@angular/core';
import { Paw } from '../markings/paw';
import { NsfwSwitchService } from './nsfw-switch.service';

@Component({
  selector: 'app-nsfw-switch',
  imports: [Paw],
  template: `
    <label class="switch">
      <span class="label">Show NSFW</span>
      <input
        #toggle
        type="checkbox"
        role="switch"
        [checked]="nsfwSwitch.isOn()"
        (change)="toggleSwitch(toggle)"
      />
      <span class="track" aria-hidden="true"
        ><span class="thumb"><app-paw /></span
      ></span>
    </label>
  `,
})
export class NsfwSwitch {
  protected readonly nsfwSwitch = inject(NsfwSwitchService);

  protected toggleSwitch(toggle: HTMLInputElement): void {
    this.nsfwSwitch.set(toggle.checked);
    // While the check waits, isOn() stays false, so the binding won't uncheck the box.
    toggle.checked = this.nsfwSwitch.isOn();
  }
}
