import { TestBed } from '@angular/core/testing';

import { SettingsBrokerService } from './settings-broker.service';

describe('SettingsBrokerService', () => {
  let service: SettingsBrokerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsBrokerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
