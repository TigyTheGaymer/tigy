import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {AdminService} from '../../services/admin.service';
import {ProfilePictureComponent} from '../../shared/components/profile-picture/profile-picture.component';
import {DialogService, DynamicDialogModule} from 'primeng/dynamicdialog';
import {NewDialogComponent} from '../new-dialog/new-dialog.component';

@Component({
  selector: 'tigy-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, ProfilePictureComponent, DynamicDialogModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {

  constructor(
    private adminService: AdminService,
    private dialogService: DialogService,
  ) {
  }
  logout() {
    this.adminService.logout();
  }

  new() {
    this.dialogService.open(NewDialogComponent, {header: 'Add new Image Item', width: '50%'})
  }
}
