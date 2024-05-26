import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { IMAGE_ITEM_COLLECTION, ImageItem } from '../shared/models/image-item.model';
import { collection, collectionData, doc, Firestore, setDoc } from '@angular/fire/firestore';
import { getDownloadURL, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
import { v4 } from 'uuid';
import { Artist, ARTIST_COLLECTION } from '../shared/models/artist.model';
import { BehaviorSubject, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  user$ = user(this.auth)
  private _imageItems$: BehaviorSubject<ImageItem[]> = new BehaviorSubject([] as ImageItem[])
  imageItems$ = this._imageItems$.asObservable().pipe(shareReplay())

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
    const upload = await uploadBytesResumable(ref(this.storage, `image-items/${uid}`), image)
    const downloadUrl = await getDownloadURL(upload.ref)
    const fullPath = upload.ref.fullPath
    const imageItem: ImageItem = {
      image: {fullPath, downloadUrl},
      artistUid
    }

    return setDoc(doc(this.firestore, `${IMAGE_ITEM_COLLECTION}/${uid}`), imageItem)
  }

  async saveNewArtist(artist: Artist) {
    const uid = v4();
    await setDoc(doc(this.firestore, `${ARTIST_COLLECTION}/${uid}`), artist)
    return uid
  }

  loadImageItems(): void {
    collectionData(collection(this.firestore, IMAGE_ITEM_COLLECTION), {idField: 'uid'}).subscribe({
      next: value => this._imageItems$.next(value as ImageItem[])
    })
  }
}
