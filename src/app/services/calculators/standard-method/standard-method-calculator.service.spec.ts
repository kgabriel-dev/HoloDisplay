import { TestBed } from '@angular/core/testing';

import { StandardMethodCalculatorService } from './standard-method-calculator.service';

describe('StandardMethodCalculatorService', () => {
  let service: StandardMethodCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StandardMethodCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
