import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ProfilePicture} from '../../models/profile-picture.model';

@Component({
  selector: 'tigy-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class AvatarComponent {

  @Input() profilePicture: ProfilePicture | undefined;

  isImageLoadError = false;
  isLoading = true;

  onImageLoadError(): void {
    this.isImageLoadError = true;
  }

  onImageLoad(): void {
    this.isLoading = false;
  }
}
