import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EscolherArmazenamento } from './escolher-armazenamento';

describe('EscolherArmazenamento', () => {
  let component: EscolherArmazenamento;
  let fixture: ComponentFixture<EscolherArmazenamento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscolherArmazenamento],
    }).compileComponents();

    fixture = TestBed.createComponent(EscolherArmazenamento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
