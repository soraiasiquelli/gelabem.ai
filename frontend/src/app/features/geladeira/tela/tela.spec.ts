import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tela } from './tela';

describe('Tela', () => {
  let component: Tela;
  let fixture: ComponentFixture<Tela>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tela],
    }).compileComponents();

    fixture = TestBed.createComponent(Tela);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
