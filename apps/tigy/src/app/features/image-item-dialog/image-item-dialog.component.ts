import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';

@Component({
  selector: 'tigy-image-item-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-item-dialog.component.html',
  styleUrl: './image-item-dialog.component.scss'
})
export class ImageItemDialogComponent {

  private imageItemsRepository = inject(ImageItemsRepository);
  imageItem$ = this.imageItemsRepository.selectedImageItem$;

}
