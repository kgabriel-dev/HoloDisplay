import { TestBed } from '@angular/core/testing';

import { SettingsBroadcastingService } from './settings-broadcasting.service';

describe('SettingsBroadcastingService', () => {
  let service: SettingsBroadcastingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsBroadcastingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
