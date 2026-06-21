import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioItem } from './formulario-item';

describe('FormularioItem', () => {
  let component: FormularioItem;
  let fixture: ComponentFixture<FormularioItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioItem],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
