import { TestBed } from '@angular/core/testing';

import { ImageItemDialogService } from './image-item-dialog.service';

describe('ImageItemDialogService', () => {
  let service: ImageItemDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageItemDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
