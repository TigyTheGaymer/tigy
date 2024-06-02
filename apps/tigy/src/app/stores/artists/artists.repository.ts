import { inject, Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import { selectAllEntities, setEntities, withEntities } from '@ngneat/elf-entities';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Artist, ARTIST_COLLECTION } from '../../shared/models/artist.model';

@Injectable({
  providedIn: 'root'
})
export class ArtistsRepository {

  private store = createStore({ name: 'artists' }, withEntities<Artist, 'uid'>({ idKey: 'uid' }));
  private firestore = inject(Firestore);
  private loaded = false;

  artists$ = this.store.pipe(selectAllEntities());

  load(): void {
    if (this.loaded) {
      console.log('artists already loaded');
      return;
    }
    this.loaded = true;
    collectionData(
      collection(this.firestore, ARTIST_COLLECTION), { idField: 'uid' }
    ).subscribe({
      next: value => this.store.update(setEntities(value as Artist[])),
      error: () => this.loaded = false,
      complete: () => this.loaded = false
    });

  }
}
