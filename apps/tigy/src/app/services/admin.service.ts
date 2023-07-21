import { Injectable } from '@angular/core';
import {user, Auth, signInWithEmailAndPassword, signOut} from '@angular/fire/auth';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  user$ = user(this.auth)

  constructor(private auth: Auth, private router: Router) { }

  async login(email: string | null | undefined, password: string | null | undefined) {
    if (!email || !password) return
    await signInWithEmailAndPassword(this.auth, email, password)
    return this.router.navigate(['/admin'])
  }

  async logout() {
    await signOut(this.auth)
    return this.router.navigate(['/admin/login'])
  }
}
