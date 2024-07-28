import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayeredDisplayComponent } from './layered-display.component';

describe('LayeredDisplayComponent', () => {
  let component: LayeredDisplayComponent;
  let fixture: ComponentFixture<LayeredDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayeredDisplayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayeredDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
