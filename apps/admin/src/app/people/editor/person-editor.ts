import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  applyEach,
  form,
  FormField,
  submit,
  validate,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImageUp, lucideTrash2 } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { personPaths, TIGY_ID, type SocialLink } from '@tigy/models';
import { checkFile, REFUSAL_MESSAGES } from '../../uploads/check-file';
import { avatarUrl, PeopleService } from '../people.service';
import {
  AVATAR_CANVAS,
  type DecodedPicture,
} from './avatar-cropper/avatar-canvas';
import { AvatarCropper } from './avatar-cropper/avatar-cropper';
import { initialCrop, type Crop } from './avatar-cropper/crop';
import { LinksEditor } from './links-editor/links-editor';
import {
  changedPersonEdits,
  isHttps,
  normalisePerson,
  toPersonModel,
  type PersonModel,
} from './person-model';

type AvatarChange =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'crop'; picture: DecodedPicture & { bitmap: ImageBitmap } };

const required = (message: string) => (value: string) =>
  value.trim() ? undefined : { kind: 'required', message };

/** A person's name, links and avatar, saved together; used on the person's page and in the credit sheet. */
@Component({
  selector: 'app-person-editor',
  imports: [
    AvatarCropper,
    FormField,
    HlmAvatarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmInputImports,
    LinksEditor,
    NgIcon,
  ],
  providers: [provideIcons({ lucideImageUp, lucideTrash2 })],
  templateUrl: './person-editor.html',
})
export class PersonEditor {
  private readonly people = inject(PeopleService);
  private readonly canvas = inject(AVATAR_CANVAS);

  readonly personId = input.required<string>();
  /** Shown in the credit panel, whose background differs from the page. */
  readonly isInPanel = input(false);
  readonly saved = output<void>();

  protected readonly person = computed(() =>
    this.people.byId().get(this.personId()),
  );
  protected readonly isTigy = computed(() => this.personId() === TIGY_ID);

  private readonly loaded = linkedSignal<string | undefined, PersonModel>({
    // A computed, so a snapshot of the same person does not rebuild the form.
    source: computed(() => this.person()?.id),
    computation: () => {
      const person = untracked(this.person);
      return person
        ? normalisePerson(toPersonModel(person))
        : { name: '', links: [] };
    },
  });
  protected readonly model = linkedSignal(() => this.loaded());
  protected readonly form = form(this.model, (path) => {
    validate(path.name, ({ value }) => required('Enter a name.')(value()));
    applyEach(path.links, (link) => {
      validate(link.network, ({ value }) =>
        required('Enter the network.')(value()),
      );
      validate(link.handle, ({ value }) =>
        required('Enter the handle.')(value()),
      );
      validate(link.url, ({ value }) =>
        isHttps(value())
          ? undefined
          : { kind: 'https', message: 'The address must start with https://' },
      );
    });
  });

  protected readonly avatarChange = linkedSignal<string, AvatarChange>({
    source: this.personId,
    computation: () => ({ kind: 'keep' }),
  });
  protected readonly crop = signal<Crop>(initialCrop(1, 1));
  protected readonly isSaving = signal(false);

  protected readonly currentAvatar = computed(() => {
    const person = this.person();
    return person ? avatarUrl(person) : undefined;
  });
  protected readonly cropping = computed(() => {
    const change = this.avatarChange();
    return change.kind === 'crop' ? change.picture : null;
  });

  readonly isDirty = computed(
    () =>
      this.person() !== undefined &&
      (Object.keys(changedPersonEdits(this.model(), this.loaded())).length >
        0 ||
        this.avatarChange().kind !== 'keep'),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  protected async pick(event: Event): Promise<void> {
    const field = event.target as HTMLInputElement;
    const file = field.files?.[0];
    field.value = '';
    if (!file) return;
    const check = await checkFile(file, { includeVideo: false });
    if ('refusal' in check) {
      toast.error(`${file.name} can't be an avatar`, {
        description: REFUSAL_MESSAGES[check.refusal],
      });
      return;
    }
    try {
      const picture = await this.canvas.decode(file);
      this.release();
      this.crop.set(initialCrop(picture.width, picture.height));
      this.avatarChange.set({ kind: 'crop', picture });
    } catch {
      toast.error(`${file.name} couldn't be opened`, {
        description: 'The file may be damaged. Try another picture.',
      });
    }
  }

  protected setLinks(links: SocialLink[]): void {
    this.model.update((model) => ({ ...model, links }));
  }

  protected removeAvatar(): void {
    this.release();
    this.avatarChange.set({ kind: 'remove' });
  }

  protected keepAvatar(): void {
    this.release();
    this.avatarChange.set({ kind: 'keep' });
  }

  /** Saves the name, links and avatar; true when nothing is left unsaved. */
  async save(): Promise<boolean> {
    const person = this.person();
    if (!person || this.isSaving()) return false;
    let isSaved = false;
    await submit(this.form, async () => {
      const edits = changedPersonEdits(this.model(), this.loaded());
      const change = this.avatarChange();
      this.isSaving.set(true);
      try {
        if (change.kind === 'crop') {
          const webp = await this.canvas.encode(
            change.picture.bitmap,
            this.crop(),
          );
          await this.people.uploadAvatar(person.id, webp);
          edits.avatar = personPaths.avatar(person.id);
        } else if (change.kind === 'remove') {
          edits.avatar = null;
        }
        if (Object.keys(edits).length)
          await this.people.update(person.id, edits);
        if (change.kind === 'remove') await this.people.deleteAvatar(person.id);
        const saved = normalisePerson(this.model());
        this.loaded.set(saved);
        this.model.set(saved);
        this.keepAvatar();
        isSaved = true;
        toast.success(`Saved ${saved.name}`);
        this.saved.emit();
      } catch {
        toast.error('The edits were not saved', {
          description:
            'Check the connection and try again. Your edits are kept.',
        });
      } finally {
        this.isSaving.set(false);
      }
    });
    return isSaved;
  }

  private release(): void {
    const change = this.avatarChange();
    if (change.kind === 'crop') change.picture.release();
  }
}
