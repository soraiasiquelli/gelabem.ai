import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelaCriar } from './tela-criar';

describe('TelaCriar', () => {
  let component: TelaCriar;
  let fixture: ComponentFixture<TelaCriar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelaCriar],
    }).compileComponents();

    fixture = TestBed.createComponent(TelaCriar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
