import { TestBed } from '@angular/core/testing';

import { LayeredDisplaySettingsBrokerService } from './layered-display-settings-broker.service';

describe('LayeredDisplaySettingsBrokerService', () => {
  let service: LayeredDisplaySettingsBrokerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayeredDisplaySettingsBrokerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
