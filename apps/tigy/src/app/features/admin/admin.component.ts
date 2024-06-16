import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AdminService } from '../../services/admin/admin.service';
import { ProfilePictureComponent } from '../../shared/components/profile-picture/profile-picture.component';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { NewDialogComponent } from '../new-dialog/new-dialog.component';
import { ImageModule } from 'primeng/image';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { ImageItem } from '@tigy/shared';
import { ImageItemDialogService } from '../../services/image-item-dialog/image-item-dialog.service';

@Component({
  selector: 'tigy-admin',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProfilePictureComponent,
    DynamicDialogModule,
    ImageModule,
    NgOptimizedImage,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  private adminService = inject(AdminService);
  private dialogService = inject(DialogService);
  private imageItemsRepository = inject(ImageItemsRepository);
  private imageItemDialogService = inject(ImageItemDialogService);

  imageItems$ = this.imageItemsRepository.imageItems$;

  ngOnInit() {
    this.imageItemsRepository.load();
  }

  logout() {
    this.adminService.logout();
  }

  new() {
    this.dialogService.open(NewDialogComponent, {
      header: 'Add new Image Item',
      width: '50%'
    });
  }

  openImage(imageItem: ImageItem) {
    this.imageItemDialogService.openImageItem(imageItem.uid);
  }
}
