import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ListaItens, GrupoItens } from './lista-itens';
import { GeladeiraService } from '../../../services/geladeira.service';
import { ListaComprasService } from '../../../services/lista-compras.service';
import { Item } from '../../../models/item.model';

function linha(id: number, nome: string, extra: Partial<Item> = {}): Item {
  return { id, nome, quantidade: 1, categoria: 1, local: 10, local_id: 10, categoria_id: 1, unidade: 'un', quantidade_minima: 0, ...extra }
}

describe('ListaItens', () => {
  let fixture: ComponentFixture<ListaItens>;
  let component: ListaItens;
  let geladeira: { getItensBD: ReturnType<typeof vi.fn>, ajustarQuantidadeBD: ReturnType<typeof vi.fn>, removeItem: ReturnType<typeof vi.fn> };
  let listaCompras: { addItemBD: ReturnType<typeof vi.fn> };
  let grupos: GrupoItens[];

  function itensDaTela(): Item[] {
    return grupos.flatMap(g => g.itens)
  }

  async function montar(itens: Item[]) {
    geladeira.getItensBD.mockReturnValue(of(itens))

    fixture = TestBed.createComponent(ListaItens)
    component = fixture.componentInstance
    component.grupos$.subscribe(g => grupos = g)
    fixture.componentRef.setInput('localId', 10)
    await fixture.whenStable()
  }

  beforeEach(() => {
    geladeira = { getItensBD: vi.fn(), ajustarQuantidadeBD: vi.fn(), removeItem: vi.fn() }
    listaCompras = { addItemBD: vi.fn().mockReturnValue(of({})) }
    grupos = []

    TestBed.configureTestingModule({
      imports: [ListaItens],
      providers: [
        { provide: GeladeiraService, useValue: geladeira },
        { provide: ListaComprasService, useValue: listaCompras },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ tipo: 'geladeira' }) } } },
      ],
    })
  })

  afterEach(() => vi.useRealTimers())

  it('junta linhas do mesmo alimento somando a quantidade e mostrando a validade mais próxima', async () => {
    await montar([
      linha(1, 'Leite', { quantidade: 2, data_validade: '2026-10-20' }),
      linha(2, 'leite', { quantidade: 3, data_validade: '2026-10-05' }),
      linha(3, 'Arroz'),
    ])

    const itens = itensDaTela()
    expect(itens.length).toBe(2)

    const leite = itens.find(i => i.nome.toLowerCase() === 'leite')!
    expect(leite.quantidade).toBe(5)
    expect(leite.data_validade).toBe('2026-10-05')
    expect(leite.linhas!.map(l => l.id)).toEqual([2, 1])
  })

  it('"usei um" tira da unidade que vence primeiro e atualiza a tela sem recarregar a lista', async () => {
    await montar([
      linha(1, 'Leite', { quantidade: 2, data_validade: '2026-10-20' }),
      linha(2, 'Leite', { quantidade: 3, data_validade: '2026-10-05' }),
    ])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: false, item: linha(2, 'Leite', { quantidade: 2 }) }))

    component.consumirItem(itensDaTela()[0])

    expect(geladeira.ajustarQuantidadeBD).toHaveBeenCalledWith(2, -1)
    expect(geladeira.getItensBD).toHaveBeenCalledTimes(1)
    expect(itensDaTela()[0].quantidade).toBe(4)
  })

  it('"comprei mais" repõe na unidade que vence por último', async () => {
    await montar([
      linha(1, 'Leite', { quantidade: 2, data_validade: '2026-10-20' }),
      linha(2, 'Leite', { quantidade: 3, data_validade: '2026-10-05' }),
    ])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: false, item: linha(1, 'Leite', { quantidade: 3 }) }))

    component.reporItem(itensDaTela()[0])

    expect(geladeira.ajustarQuantidadeBD).toHaveBeenCalledWith(1, 1)
  })

  it('g e mL andam de 100 em 100', async () => {
    await montar([linha(1, 'Farinha', { quantidade: 500, unidade: 'g' })])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: false, item: linha(1, 'Farinha', { quantidade: 400, unidade: 'g' }) }))

    component.consumirItem(itensDaTela()[0])

    expect(geladeira.ajustarQuantidadeBD).toHaveBeenCalledWith(1, -100)
  })

  it('quando a última unidade acaba, o item sai da lista e aparece o aviso com atalho pra lista de compras', async () => {
    await montar([linha(1, 'Leite', { quantidade: 1, quantidade_minima: 2 })])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: true, item: linha(1, 'Leite') }))

    component.consumirItem(itensDaTela()[0])

    expect(itensDaTela()).toEqual([])
    expect(component.aviso?.texto).toBe('Leite acabou.')

    component.adicionarNaListaDeCompras()
    expect(listaCompras.addItemBD).toHaveBeenCalledWith({ nome: 'Leite', quantidade: 2, unidade: 'un' })
    expect(component.aviso?.texto).toContain('entrou na lista de compras')
  })

  it('se acabar só uma das unidades e ainda sobrar outra, não avisa que acabou', async () => {
    await montar([
      linha(1, 'Leite', { quantidade: 1, data_validade: '2026-10-05' }),
      linha(2, 'Leite', { quantidade: 4, data_validade: '2026-10-20' }),
    ])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: true, item: linha(1, 'Leite') }))

    component.consumirItem(itensDaTela()[0])

    expect(component.aviso).toBeNull()
    expect(itensDaTela()[0].quantidade).toBe(4)
  })

  it('se a baixa falhar (ex.: item já mudou), busca o estado real do servidor', async () => {
    await montar([linha(1, 'Leite', { quantidade: 2 })])
    geladeira.ajustarQuantidadeBD.mockReturnValue(throwError(() => ({ status: 404 })))

    component.consumirItem(itensDaTela()[0])

    expect(geladeira.getItensBD).toHaveBeenCalledTimes(2)
  })

  it('o aviso some sozinho depois de alguns segundos', async () => {
    await montar([linha(1, 'Leite', { quantidade: 1 })])
    geladeira.ajustarQuantidadeBD.mockReturnValue(of({ removido: true, item: linha(1, 'Leite') }))
    vi.useFakeTimers()

    component.consumirItem(itensDaTela()[0])
    expect(component.aviso).not.toBeNull()

    vi.advanceTimersByTime(7100)
    expect(component.aviso).toBeNull()
  })

  it('remover apaga todas as linhas do grupo e tira da tela', async () => {
    await montar([linha(1, 'Leite'), linha(2, 'Leite'), linha(3, 'Arroz')])
    geladeira.removeItem.mockReturnValue(of({}))

    component.removerItem(itensDaTela().find(i => i.nome === 'Leite')!)

    expect(geladeira.removeItem).toHaveBeenCalledWith(1)
    expect(geladeira.removeItem).toHaveBeenCalledWith(2)
    expect(itensDaTela().map(i => i.nome)).toEqual(['Arroz'])
  })
})
