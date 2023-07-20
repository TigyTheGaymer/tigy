import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InputTextModule} from 'primeng/inputtext';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {PasswordModule} from 'primeng/password';
import {ButtonModule} from 'primeng/button';
import {AdminService} from '../../services/admin.service';

@Component({
  selector: 'tigy-admin-login',
  standalone: true,
  imports: [CommonModule, InputTextModule, ReactiveFormsModule, PasswordModule, ButtonModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss'],
})
export class AdminLoginComponent {

  constructor(private adminService: AdminService) {
  }

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', Validators.required),
  })

  login() {
    if (this.loginForm.invalid) return
    const {email, password} = this.loginForm.value
    this.adminService.login(email, password);
  }
}
