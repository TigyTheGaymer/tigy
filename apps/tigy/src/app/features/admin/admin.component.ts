import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AdminService } from '../../services/admin.service';
import { ProfilePictureComponent } from '../../shared/components/profile-picture/profile-picture.component';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { NewDialogComponent } from '../new-dialog/new-dialog.component';
import { ImageModule } from 'primeng/image';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ImageItemDialogComponent } from '../image-item-dialog/image-item-dialog.component';
import { ImageItem } from '@tigy/shared';

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
    DialogModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  private adminService = inject(AdminService);
  private dialogService = inject(DialogService);
  private cdkDialogService = inject(Dialog);
  private imageItemsRepository = inject(ImageItemsRepository);

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
    this.imageItemsRepository.setActive(imageItem.uid);
    this.cdkDialogService.open(ImageItemDialogComponent, {
      height: '100%',
      width: '100%'
    });
  }
}
