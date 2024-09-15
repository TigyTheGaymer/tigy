import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TigyIcons } from '../../shared/constants/tigy-icon';
import { animate, group, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'tigy-image-item-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './image-item-dialog.component.html',
  styleUrl: './image-item-dialog.component.scss',
  animations: [
    trigger('infoOpen', [
      state('false', style({ transform: 'translate3d(360px, 0, 0)', width: '0' })),
      state('true', style({ transform: 'translate3d(0, 0, 0)', width: '350px' })),
      transition(
        'true => false',
        group([
          // On Close
          animate('200ms ease-in')
        ])
      ),
      transition(
        'false => true',
        group([
          // On Open
          animate('250ms ease-out')
        ])
      )
    ])
  ]
})
export class ImageItemDialogComponent {

  private imageItemsRepository = inject(ImageItemsRepository);
  private dynamicDialogRef = inject(DynamicDialogRef);
  private dialogService = inject(DialogService);
  imageItem$ = this.imageItemsRepository.selectedImageItem$;
  isInfoOpen = signal(false);

  readonly TigyIcons = TigyIcons;

  constructor() {
    this.dialogService.getInstance(this.dynamicDialogRef).maximize();
  }

  close() {
    this.dynamicDialogRef.close();
  }

  toggleInfo() {
    this.isInfoOpen.update(value => !value);
  }

  closeInfo() {
    this.isInfoOpen.set(false);
  }
}
