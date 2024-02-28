import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HoloDisplayComponent } from './holodisplay.component';

describe('PyramidDisplayComponent', () => {
  let component: HoloDisplayComponent;
  let fixture: ComponentFixture<HoloDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ HoloDisplayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HoloDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
