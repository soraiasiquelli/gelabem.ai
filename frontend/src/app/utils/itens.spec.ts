import { Item } from '../models/item.model';
import { encontrarNoEstoque, ordenarPorValidade, passoDaUnidade, unidadeContavel } from './itens';

function item(id: number, nome: string, extra: Partial<Item> = {}): Item {
  return { id, nome, quantidade: 1, categoria: 1, local: 1, unidade: 'un', quantidade_minima: 0, ...extra }
}

describe('itens utils', () => {

  it('passo: g e mL andam de 100 em 100, o resto de 1 em 1', () => {
    expect(passoDaUnidade('g')).toBe(100)
    expect(passoDaUnidade('mL')).toBe(100)
    expect(passoDaUnidade('un')).toBe(1)
    expect(passoDaUnidade('kg')).toBe(1)
  })

  it('só un, cx e pct são contáveis', () => {
    expect(['un', 'cx', 'pct'].every(unidadeContavel)).toBe(true)
    expect(['kg', 'g', 'L', 'mL'].some(unidadeContavel)).toBe(false)
  })

  it('ordena por validade com os sem data no fim, sem alterar o original', () => {
    const original = [
      item(1, 'A'),
      item(2, 'B', { data_validade: '2026-10-05' }),
      item(3, 'C', { data_validade: '2026-10-01' }),
    ]
    const ordenado = ordenarPorValidade(original)
    expect(ordenado.map(i => i.id)).toEqual([3, 2, 1])
    expect(original.map(i => i.id)).toEqual([1, 2, 3])
  })

  describe('encontrarNoEstoque', () => {
    const estoque = [
      item(1, 'Leite', { data_validade: '2026-10-10' }),
      item(2, 'Leite', { data_validade: '2026-10-02' }),
      item(3, 'Leite condensado'),
      item(4, 'Ovos'),
      item(5, 'Sal'),
      item(6, 'Frango'),
      item(7, 'Pão'),
    ]

    it('nome igual vence e vem do que vence primeiro', () => {
      expect(encontrarNoEstoque('leite', estoque).map(i => i.id)).toEqual([2, 1])
    })

    it('ignora acento, caixa e plural simples', () => {
      expect(encontrarNoEstoque('Ovo', estoque).map(i => i.id)).toEqual([4])
      expect(encontrarNoEstoque('PÃO', estoque).map(i => i.id)).toEqual([7])
    })

    it('ingrediente descritivo casa com o alimento ("peito de frango" → Frango)', () => {
      expect(encontrarNoEstoque('peito de frango', estoque).map(i => i.id)).toEqual([6])
    })

    it('não confunde "sal" com "salsicha" (palavras inteiras)', () => {
      expect(encontrarNoEstoque('salsicha', estoque)).toEqual([])
      expect(encontrarNoEstoque('sal', estoque).map(i => i.id)).toEqual([5])
    })

    it('sem correspondência devolve vazio', () => {
      expect(encontrarNoEstoque('macarrão', estoque)).toEqual([])
      expect(encontrarNoEstoque('a', estoque)).toEqual([])
    })
  })
})
