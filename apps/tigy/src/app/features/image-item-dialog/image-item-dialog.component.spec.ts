import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageItemDialogComponent } from './image-item-dialog.component';

describe('ImageItemDialogComponent', () => {
  let component: ImageItemDialogComponent;
  let fixture: ComponentFixture<ImageItemDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageItemDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
