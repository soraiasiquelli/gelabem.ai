import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LerNotafiscal } from './ler-notafiscal';

describe('LerNotafiscal', () => {
  let component: LerNotafiscal;
  let fixture: ComponentFixture<LerNotafiscal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LerNotafiscal],
    }).compileComponents();

    fixture = TestBed.createComponent(LerNotafiscal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
