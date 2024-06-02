import { inject, Injectable } from '@angular/core';
import { ImageItemDialogComponent } from '../../features/image-item-dialog/image-item-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';

@Injectable({
  providedIn: 'root'
})
export class ImageItemDialogService {

  private activatedRoute = inject(ActivatedRoute);
  private cdkDialogService = inject(Dialog);
  private router = inject(Router);
  private imageItemsRepository = inject(ImageItemsRepository);

  private imageItemDialogRef$ = new BehaviorSubject<DialogRef<unknown, ImageItemDialogComponent> | null>(null);

  constructor() {
    this.initQueryParam();
    this.initDialogOpener();
    this.initDialogClose();
  }

  // reads query param value and writes active item in store
  private initQueryParam(): void {
    this.activatedRoute.queryParamMap.pipe(
      map(p => p.get('imageItemUid'))
    ).subscribe(imageItemUid => {
      this.imageItemsRepository.setActive(imageItemUid);
    });
  }

  // get active item from store and opens dialog
  private initDialogOpener(): void {
    this.imageItemsRepository.selectedImageItem$.pipe(
      filter(item => !!item),
      filter(() => !this.imageItemDialogRef$.value)
    ).subscribe(() => {
      const imageItemDialogRef = this.cdkDialogService.open(ImageItemDialogComponent, {
        height: '100%',
        width: '100%'
      });
      this.imageItemDialogRef$.next(imageItemDialogRef);
    });
  }

  // remove query param and set dialog ref to null
  private initDialogClose(): void {
    this.imageItemDialogRef$.pipe(
      filter(ref => !!ref),
      switchMap(ref => {
        // @ts-expect-error Is filtered
        return ref.closed;
      })
    ).subscribe(() => {
      this.imageItemDialogRef$.next(null);
      this.router.navigate([], { queryParams: {} });
    });
  }

  openImageItem(uid: string): void {
    this.router.navigate([], { queryParams: { imageItemUid: uid } });
  }
}
