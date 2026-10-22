import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './confirm.service';
import { unsavedEditsGuard } from './unsaved-edits.guard';

function leave(hasUnsavedEdits: boolean, answer: boolean) {
  const ask = vi.fn(async () => answer);
  TestBed.configureTestingModule({
    providers: [{ provide: ConfirmService, useValue: { ask } }],
  });
  const result = TestBed.runInInjectionContext(() =>
    unsavedEditsGuard(
      { hasUnsavedEdits: () => hasUnsavedEdits },
      {} as never,
      {} as never,
      {} as never,
    ),
  );
  return { ask, result };
}

describe('unsavedEditsGuard', () => {
  it('lets a page without unsaved edits go without asking', async () => {
    const { ask, result } = leave(false, false);
    expect(await result).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it('Leaving with unsaved edits: asks, and leaves when the owner agrees', async () => {
    const { ask, result } = leave(true, true);
    expect(await result).toBe(true);
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Leave without saving?' }),
    );
  });

  it('stays when the owner chooses to stay', async () => {
    expect(await leave(true, false).result).toBe(false);
  });
});
