import { TestBed } from '@angular/core/testing';
import { AgeCheckService } from './age-check.service';
import { NsfwSwitch } from './nsfw-switch';

describe('NsfwSwitch', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [NsfwSwitch] });
  });

  async function render() {
    const fixture = TestBed.createComponent(NsfwSwitch);
    await fixture.whenStable();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector(
      'input[role="switch"]',
    ) as HTMLInputElement;
    return { fixture, toggle };
  }

  it('stays unchecked and asks for the age check before it has passed', async () => {
    const { fixture, toggle } = await render();
    const ageCheck = TestBed.inject(AgeCheckService);
    toggle.click();
    await fixture.whenStable();
    expect(toggle.checked).toBe(false);
    expect(ageCheck.isPending()).toBe(true);

    ageCheck.pass();
    await fixture.whenStable();
    expect(toggle.checked).toBe(true);
  });

  it('switches at once after the age check passed', async () => {
    localStorage.setItem('tigy.nsfw.age', '1');
    const { fixture, toggle } = await render();
    toggle.click();
    await fixture.whenStable();
    expect(toggle.checked).toBe(true);
    expect(TestBed.inject(AgeCheckService).isPending()).toBe(false);
  });
});
