import { Injectable } from '@angular/core';
import {user, Auth, signInWithEmailAndPassword} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  user$ = user(this.auth)

  constructor(private auth: Auth) { }

  async login(email: string | null | undefined, password: string | null | undefined) {
    if (!email || !password) return
    return signInWithEmailAndPassword(this.auth, email, password);
  }
}
