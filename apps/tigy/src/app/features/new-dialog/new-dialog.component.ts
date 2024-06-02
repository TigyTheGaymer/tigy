import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { DropdownModule } from 'primeng/dropdown';
import { map, of } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { SocialType } from '../../shared/models/social.model';
import { ArtistsRepository } from '../../stores/artists/artists.repository';

@Component({
  selector: 'tigy-new-dialog',
  standalone: true,
  imports: [CommonModule, FileUploadModule, DropdownModule, ReactiveFormsModule, InputTextModule, DynamicDialogModule],
  templateUrl: './new-dialog.component.html',
  styleUrls: ['./new-dialog.component.scss']
})
export class NewDialogComponent implements OnInit {

  private artistsRepository = inject(ArtistsRepository);
  private adminService = inject(AdminService);
  private dynamicDialogRef = inject(DynamicDialogRef);

  artistOptions$ = this.artistsRepository.artists$.pipe(
    map(artists => artists.map(
      ({ name, uid }) => ({ label: name, value: uid }))
    )
  );

  socialTypeOptions$ = of([
    { label: 'Twitter', value: SocialType.TWITTER },
    { label: 'Other', value: SocialType.OTHER }
  ]);

  newArtistForm?: FormGroup;

  isLoading = false;

  form = new FormGroup({
    image: new FormControl(null, Validators.required),
    artistUid: new FormControl<string | null>(null)
  });

  ngOnInit() {
    this.artistsRepository.load();
  }

  onUpload(event: any): void {
    this.form.controls.image.setValue(event.currentFiles[0]);
  }

  onRemove(): void {
    this.form.controls.image.setValue(null);
  }

  async save() {
    if (this.isSubmitDisabled()) return;
    const { image } = this.form.value;
    let { artistUid } = this.form.value;
    if (!image) return;
    this.isLoading = true;
    if (this.newArtistForm) {
      artistUid = await this.adminService.saveNewArtist(this.newArtistForm.value);
    }
    if (!artistUid) {
      this.isLoading = false;
      return;
    }
    await this.adminService.uploadNewImageItem(image, artistUid);
    this.dynamicDialogRef.close();
    this.isLoading = false;
  }

  newArtist(): void {
    this.form.controls.artistUid.setValue(null);
    this.newArtistForm = new FormGroup({
      name: new FormControl('', Validators.required),
      socials: new FormArray<FormGroup>([])
    });
    this.addSocial();
  }

  selectArtist(): void {
    this.form.controls.artistUid.enable();
    this.newArtistForm = undefined;
  }

  addSocial(): void {
    this.form.controls.artistUid.disable();
    const social = new FormGroup({
      type: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      url: new FormControl('')
    });
    this.socials?.push(social);
  }

  deleteSocial(index: number) {
    this.socials.removeAt(index);
  }

  isSubmitDisabled() {
    if (this.newArtistForm) {
      return this.newArtistForm.invalid || this.form.invalid;
    }

    // FIXME artistUid only required when no newArtistForm. Workaround because cant find away to write a good custom validator
    return this.form.invalid || !this.form.value.artistUid;
  }

  get socials(): FormArray<FormGroup> {
    return this.newArtistForm?.controls['socials'] as FormArray<FormGroup>;
  }
}
