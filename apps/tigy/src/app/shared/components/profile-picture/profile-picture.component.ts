import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ImageCroppedEvent, ImageCropperModule } from 'ngx-image-cropper';
import { FileUploadModule } from 'primeng/fileupload';
import { AvatarComponent } from '../avatar/avatar.component';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ProfilePicture } from '@tigy/shared';

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

  private domSanitizer = inject(DomSanitizer);

  @Input() profilePicture?: ProfilePicture;
  @Output() saveNewProfilePicture = new EventEmitter<SafeUrl>();

  imageFile?: File;
  isCropperImageLoaded?: boolean;
  private croppedImage?: SafeUrl;
  private isCropperReady?: boolean;

  fileChangeEvent($event: any): void {
    this.imageFile = $event.currentFiles[0];
  }

  imageCropped($event: ImageCroppedEvent): void {
    console.log($event);
    if (!$event.objectUrl) return;
    this.croppedImage = this.domSanitizer.bypassSecurityTrustUrl($event.objectUrl);
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
    console.log(this.croppedImage);
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
