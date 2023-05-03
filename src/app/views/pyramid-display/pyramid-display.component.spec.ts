import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PyramidDisplayComponent } from './pyramid-display.component';

describe('PyramidDisplayComponent', () => {
  let component: PyramidDisplayComponent;
  let fixture: ComponentFixture<PyramidDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ PyramidDisplayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PyramidDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
