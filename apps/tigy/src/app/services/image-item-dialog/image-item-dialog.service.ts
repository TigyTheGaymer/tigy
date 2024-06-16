import { inject, Injectable } from '@angular/core';
import { ImageItemDialogComponent } from '../../features/image-item-dialog/image-item-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';
import { ImageItemsRepository } from '../../stores/image-items/image-items.repository';
import { DialogService } from 'primeng/dynamicdialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog/dynamicdialog-ref';

@Injectable({
  providedIn: 'root'
})
export class ImageItemDialogService {

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private imageItemsRepository = inject(ImageItemsRepository);
  private dialogService = inject(DialogService);

  private imageItemDialogRef$ = new BehaviorSubject<DynamicDialogRef<ImageItemDialogComponent> | null>(null);

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

      // when active is undefined close the dialog. For example on back navigation
      if (!imageItemUid && this.imageItemDialogRef$.value) {
        this.imageItemDialogRef$.value?.close();
      }
    });
  }

  // get active item from store and opens dialog
  private initDialogOpener(): void {
    this.imageItemsRepository.selectedImageItem$.pipe(
      filter(item => !!item),
      filter(() => !this.imageItemDialogRef$.value)
    ).subscribe(() => {
      const imageItemDialogRef = this.dialogService.open(ImageItemDialogComponent, {
        height: '100%',
        width: '100%',
        showHeader: false,
        closeOnEscape: true,
        style: { padding: 0 },
        contentStyle: { padding: 0 }
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
        return ref.onClose;
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
