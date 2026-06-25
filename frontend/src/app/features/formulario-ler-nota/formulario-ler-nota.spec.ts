import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioLerNota } from './formulario-ler-nota';

describe('FormularioLerNota', () => {
  let component: FormularioLerNota;
  let fixture: ComponentFixture<FormularioLerNota>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioLerNota],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioLerNota);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
