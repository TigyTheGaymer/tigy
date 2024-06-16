import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'tigy-image-item-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-item-dialog.component.html',
  styleUrl: './image-item-dialog.component.scss'
})
export class ImageItemDialogComponent {

  private imageItemsRepository = inject(ImageItemsRepository);
  private dynamicDialogRef = inject(DynamicDialogRef);
  private dialogService = inject(DialogService);
  imageItem$ = this.imageItemsRepository.selectedImageItem$;

  constructor() {
    this.dialogService.getInstance(this.dynamicDialogRef).maximize();
  }

}
