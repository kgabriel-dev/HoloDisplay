import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayeredSettingsComponent } from './layered-settings.component';

describe('LayeredSettingsComponent', () => {
  let component: LayeredSettingsComponent;
  let fixture: ComponentFixture<LayeredSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayeredSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayeredSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
