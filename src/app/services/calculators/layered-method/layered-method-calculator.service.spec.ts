import { TestBed } from '@angular/core/testing';

import { LayeredMethodCalculatorService } from './layered-method-calculator.service';

describe('LayeredMethodCalculatorService', () => {
  let service: LayeredMethodCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayeredMethodCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
