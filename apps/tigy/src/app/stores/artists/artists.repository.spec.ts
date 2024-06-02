import { TestBed } from '@angular/core/testing';

import { ArtistsRepository } from './artists.repository';

describe('ArtistsRepository', () => {
  let service: ArtistsRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArtistsRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
