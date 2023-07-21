import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {ButtonModule} from 'primeng/button';
import {AdminService} from '../../services/admin.service';
import {ProfilePictureComponent} from '../../shared/components/profile-picture/profile-picture.component';

@Component({
  selector: 'tigy-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, ProfilePictureComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {

  constructor(private adminService: AdminService) {
  }
  logout() {
    this.adminService.logout();
  }
}
