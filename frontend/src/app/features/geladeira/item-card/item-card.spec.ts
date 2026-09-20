import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemCard } from './item-card';
import { Item } from '../../../models/item.model';
import { dataEmDias } from '../../../utils/validade';

function criarItem(extra: Partial<Item> = {}): Item {
  return { id: 1, nome: 'Leite', quantidade: 2, categoria: 1, local: 1, unidade: 'un', quantidade_minima: 1, ...extra }
}

describe('ItemCard', () => {
  let component: ItemCard;
  let fixture: ComponentFixture<ItemCard>;
  let el: HTMLElement;

  async function renderizar(item: Item, selecionavel = false) {
    fixture.componentRef.setInput('item', item)
    fixture.componentRef.setInput('selecionavel', selecionavel)
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCard);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement
  });

  it('mostra nome e quantidade', async () => {
    await renderizar(criarItem())
    expect(el.querySelector('.nomeItem')?.textContent).toContain('Leite')
    expect(el.querySelector('.quantItem')?.textContent).toContain('2 un')
  });

  it('sem data de validade não mostra etiqueta', async () => {
    await renderizar(criarItem())
    expect(el.querySelector('.chipValidade')).toBeNull()
  });

  it('item que vence amanhã mostra etiqueta de atenção', async () => {
    await renderizar(criarItem({ data_validade: dataEmDias(1) }))
    const chip = el.querySelector('.chipValidade')
    expect(chip?.textContent).toContain('Vence amanhã')
    expect(chip?.classList).toContain('chipValidade--breve')
  });

  it('item vencido mostra etiqueta de alerta', async () => {
    await renderizar(criarItem({ data_validade: dataEmDias(-2) }))
    const chip = el.querySelector('.chipValidade')
    expect(chip?.textContent).toContain('Venceu há 2 dias')
    expect(chip?.classList).toContain('chipValidade--vencido')
  });

  it('"−" emite consumir e "+" emite repor, com o item', async () => {
    const item = criarItem()
    await renderizar(item)

    const consumidos: Item[] = []
    const repostos: Item[] = []
    component.consumir.subscribe(i => consumidos.push(i))
    component.repor.subscribe(i => repostos.push(i))

    const [menos, mais] = Array.from(el.querySelectorAll<HTMLButtonElement>('.btnPasso'))
    menos.click()
    mais.click()

    expect(consumidos).toEqual([item])
    expect(repostos).toEqual([item])
  });

  it('o passo é 100 para g e mL e 1 para o resto', async () => {
    await renderizar(criarItem({ unidade: 'g' }))
    expect(component.passo).toBe(100)
    await renderizar(criarItem({ unidade: 'un' }))
    expect(component.passo).toBe(1)
  });

  it('no modo seleção esconde a baixa rápida e o clique seleciona', async () => {
    const item = criarItem()
    await renderizar(item, true)

    expect(el.querySelector('.btnPasso')).toBeNull()

    const selecionados: Item[] = []
    component.selecionar.subscribe(i => selecionados.push(i))
    ;(el.querySelector('.cardItem') as HTMLElement).click()
    expect(selecionados).toEqual([item])
  });
});
