import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {ImageCroppedEvent, ImageCropperModule} from 'ngx-image-cropper';
import {FileUploadModule} from 'primeng/fileupload';
import {AvatarComponent} from '../avatar/avatar.component';
import {CommonModule} from '@angular/common';
import {ProfilePicture} from '../../models/profile-picture.model';

@Component({
  selector: 'tigy-profile-picture',
  templateUrl: './profile-picture.component.html',
  styleUrls: ['./profile-picture.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FileUploadModule,
    AvatarComponent,
    CommonModule,
    ImageCropperModule
  ],
  standalone: true
})
export class ProfilePictureComponent {

  @Input() profilePicture?: ProfilePicture;
  @Output() saveNewProfilePicture = new EventEmitter<string>();

  imageFile?: File;
  isCropperImageLoaded?: boolean;
  private croppedImage?: string;
  private isCropperReady?: boolean;

  fileChangeEvent($event: any): void {
    this.imageFile = $event.currentFiles[0];
  }

  imageCropped($event: ImageCroppedEvent): void {
    this.croppedImage = $event.base64 || undefined;
  }

  cropperImageLoaded(): void {
    this.isCropperImageLoaded = true;
  }

  cropperReady(): void {
    this.isCropperReady = true;
  }

  loadImageFailed(): void {
    this.cancelProfilePicture();
  }

  get showProfilePicture(): boolean {
    return !this.isCropperImageLoaded && !this.imageFile;
  }

  get showPictureLoading(): boolean {
    return !!this.imageFile && !this.isCropperReady;
  }

  saveProfilePicture(): void {
    if (!this.croppedImage) {
      return;
    }
    this.saveNewProfilePicture.emit(this.croppedImage);
    this.cancelProfilePicture();
  }

  cancelProfilePicture(): void {
    this.imageFile = undefined;
    this.croppedImage = undefined;
    this.isCropperImageLoaded = false;
    this.isCropperReady = false;
  }

}
