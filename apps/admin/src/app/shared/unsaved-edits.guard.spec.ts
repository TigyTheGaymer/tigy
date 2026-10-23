import { TestBed } from '@angular/core/testing';
import { FakeConfirmService } from '../testing';
import type { Answer } from './confirm.service';
import { ConfirmService } from './confirm.service';
import { unsavedEditsGuard, type HasUnsavedEdits } from './unsaved-edits.guard';

function leave(page: HasUnsavedEdits, confirm: FakeConfirmService) {
  TestBed.configureTestingModule({
    providers: [{ provide: ConfirmService, useValue: confirm }],
  });
  return TestBed.runInInjectionContext(() =>
    unsavedEditsGuard(page, {} as never, {} as never, {} as never),
  );
}

const dirty = (save?: () => Promise<boolean>): HasUnsavedEdits => ({
  hasUnsavedEdits: () => true,
  save,
});

describe('unsavedEditsGuard', () => {
  it('lets a page without unsaved edits go without asking', async () => {
    const confirm = new FakeConfirmService(false);
    expect(await leave({ hasUnsavedEdits: () => false }, confirm)).toBe(true);
    expect(confirm.asked).toEqual([]);
  });

  describe('a page that cannot save', () => {
    it('Leaving with unsaved edits: asks with only Stay and Leave, and leaves when the owner agrees', async () => {
      const confirm = new FakeConfirmService(true);
      expect(await leave(dirty(), confirm)).toBe(true);
      expect(confirm.asked).toEqual([
        expect.objectContaining({ title: 'Leave without saving?' }),
      ]);
      expect(confirm.asked[0].alternative).toBeUndefined();
    });

    it('stays when the owner chooses to stay', async () => {
      expect(await leave(dirty(), new FakeConfirmService(false))).toBe(false);
    });
  });

  describe('a page that can save', () => {
    function choose(answer: Answer, isSaved = true) {
      const save = vi.fn(async () => isSaved);
      const confirm = new FakeConfirmService(false, [answer]);
      return { result: leave(dirty(save), confirm), save, confirm };
    }

    it('offers Save and leave', async () => {
      const { result, confirm } = choose('cancel');
      await result;
      expect(confirm.asked[0]).toEqual(
        expect.objectContaining({
          title: 'Leave without saving?',
          alternative: 'Save and leave',
        }),
      );
    });

    it('Staying: stays without saving', async () => {
      const { result, save } = choose('cancel');
      expect(await result).toBe(false);
      expect(save).not.toHaveBeenCalled();
    });

    it('Leaving without saving: leaves without saving', async () => {
      const { result, save } = choose('confirm');
      expect(await result).toBe(true);
      expect(save).not.toHaveBeenCalled();
    });

    it('Saving on the way out: saves, then leaves', async () => {
      const { result, save } = choose('alternative');
      expect(await result).toBe(true);
      expect(save).toHaveBeenCalledOnce();
    });

    it('stays when the save does not go through', async () => {
      expect(await choose('alternative', false).result).toBe(false);
    });
  });
});
