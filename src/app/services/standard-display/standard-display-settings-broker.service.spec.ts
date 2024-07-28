import { TestBed } from '@angular/core/testing';

import { StandardDisplaySettingsBrokerService } from './standard-display-settings-broker.service';

describe('SettingsBrokerService', () => {
  let service: StandardDisplaySettingsBrokerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StandardDisplaySettingsBrokerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
