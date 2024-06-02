import { inject, Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import {
  selectActiveEntity,
  selectAllEntities,
  setActiveId,
  setEntities,
  withActiveId,
  withEntities
} from '@ngneat/elf-entities';
import { IMAGE_ITEM_COLLECTION, ImageItem } from '@tigy/shared';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ImageItemsRepository {

  private store = createStore(
    { name: 'image-items' },
    withEntities<ImageItem, 'uid'>({ idKey: 'uid' }),
    withActiveId()
  );

  private firestore = inject(Firestore);

  private loaded = false;

  imageItems$ = this.store.pipe(selectAllEntities());
  selectedImageItem$ = this.store.pipe(selectActiveEntity());

  load(): void {
    if (this.loaded) {
      console.log('image-items already loaded');
      return;
    }
    this.loaded = true;
    collectionData(
      collection(this.firestore, IMAGE_ITEM_COLLECTION),
      { idField: 'uid' }
    ).subscribe({
      next: value => this.store.update(setEntities(value as ImageItem[])),
      error: () => this.loaded = false,
      complete: () => this.loaded = false
    });
  }

  setActive(uid: string | null): void {
    this.store.update(setActiveId(uid));
  }
}
