import { TestBed } from '@angular/core/testing';

import { SettingsKeeperService } from './settings-keeper.service';

describe('SettingsKeeperService', () => {
  let service: SettingsKeeperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsKeeperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
