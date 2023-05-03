import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardDisplayComponent } from './standard-display.component';

describe('StandardDisplayComponent', () => {
  let component: StandardDisplayComponent;
  let fixture: ComponentFixture<StandardDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ StandardDisplayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
