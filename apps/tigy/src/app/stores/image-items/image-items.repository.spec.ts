import { TestBed } from '@angular/core/testing';

import { ImageItemsRepository } from './image-items.repository';

describe('ImageItemsRepository', () => {
  let service: ImageItemsRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageItemsRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
