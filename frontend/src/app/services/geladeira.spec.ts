import { TestBed } from '@angular/core/testing';
import { GeladeiraService } from './geladeira.service';

describe('Geladeira', () => {
  let service: GeladeiraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeladeiraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
