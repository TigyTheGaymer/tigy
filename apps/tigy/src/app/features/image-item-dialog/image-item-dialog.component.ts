import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { TigyIcons } from '../../shared/constants/tigy-icon';

@Component({
  selector: 'tigy-image-item-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './image-item-dialog.component.html',
  styleUrl: './image-item-dialog.component.scss'
})
export class ImageItemDialogComponent {

  private imageItemsRepository = inject(ImageItemsRepository);
  private dynamicDialogRef = inject(DynamicDialogRef);
  private dialogService = inject(DialogService);
  imageItem$ = this.imageItemsRepository.selectedImageItem$;

  readonly TigyIcons = TigyIcons;

  constructor() {
    this.dialogService.getInstance(this.dynamicDialogRef).maximize();
  }

  close() {
    this.dynamicDialogRef.close();
  }
}
