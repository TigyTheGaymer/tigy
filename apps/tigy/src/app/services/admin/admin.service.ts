import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { IMAGE_ITEM_COLLECTION, ImageItem, PROFILE_PICTURE_COLLECTION } from '@tigy/shared';
import { doc, Firestore, serverTimestamp, setDoc } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
import { v4 } from 'uuid';
import { Artist, ARTIST_COLLECTION } from '../../shared/models/artist.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  user$ = user(this.auth)

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: Firestore,
    private storage: Storage
  ) {
  }

  async login(email: string | null | undefined, password: string | null | undefined) {
    if (!email || !password) return
    await signInWithEmailAndPassword(this.auth, email, password)
    return this.router.navigate(['/admin'])
  }

  async logout() {
    await signOut(this.auth)
    return this.router.navigate(['/admin/login'])
  }

  async uploadNewImageItem(image: File, artistUid: string) {
    const uid = v4();
    const upload = await uploadBytesResumable(ref(this.storage, `image-items/${uid}/image`), image)
    const downloadUrl = await getDownloadURL(upload.ref)
    const fullPath = upload.ref.fullPath
    const createTimestamp = serverTimestamp()
    const imageItem: ImageItem = {
      uid,
      image: {fullPath, downloadUrl},
      artistUid,
      createTimestamp
    }

    return setDoc(doc(this.firestore, `${IMAGE_ITEM_COLLECTION}/${uid}`), imageItem)
  }

  async uploadNewProfilePicture(image: File, artistUid: string) {
    const uid = v4();
    const upload = await uploadBytesResumable(ref(this.storage, `profile-pictures/${uid}/image`), image)
    const downloadUrl = await getDownloadURL(upload.ref)
    const fullPath = upload.ref.fullPath
    const createTimestamp = serverTimestamp()
    const imageItem: ImageItem = {
      uid,
      image: {fullPath, downloadUrl},
      artistUid,
      createTimestamp
    }

    return setDoc(doc(this.firestore, `${PROFILE_PICTURE_COLLECTION}/${uid}`), imageItem)
  }

  async saveNewArtist(artist: Artist) {
    const uid = v4();
    await setDoc(doc(this.firestore, `${ARTIST_COLLECTION}/${uid}`), artist)
    return uid
  }
}
