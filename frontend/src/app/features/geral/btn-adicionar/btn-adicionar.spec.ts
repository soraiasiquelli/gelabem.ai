import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtnAdicionar } from './btn-adicionar';

describe('BtnAdicionar', () => {
  let component: BtnAdicionar;
  let fixture: ComponentFixture<BtnAdicionar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BtnAdicionar],
    }).compileComponents();

    fixture = TestBed.createComponent(BtnAdicionar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
