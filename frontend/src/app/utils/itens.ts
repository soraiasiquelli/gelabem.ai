import { Item } from '../models/item.model';

/** Quanto cada toque em "−" / "+" muda: pesos e volumes pequenos andam de 100 em 100. */
export function passoDaUnidade(unidade: string): number {
  return unidade === 'g' || unidade === 'mL' ? 100 : 1
}

/** Itens contáveis (un/cx/pct) dá pra descontar sem chute; peso e volume, não. */
export function unidadeContavel(unidade: string): boolean {
  return unidade === 'un' || unidade === 'cx' || unidade === 'pct'
}

/** Quem vence primeiro vem primeiro; sem data vai pro fim. */
export function ordenarPorValidade<T extends { data_validade?: string | null }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    if (!a.data_validade && !b.data_validade) return 0
    if (!a.data_validade) return 1
    if (!b.data_validade) return -1
    return a.data_validade.localeCompare(b.data_validade)
  })
}

/** "Pães " e "pao" viram a mesma chave: sem acento, minúsculo, sem plural simples. */
function chave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(palavra => (palavra.length > 3 && palavra.endsWith('s') ? palavra.slice(0, -1) : palavra))
    .join(' ')
}

/** Todas as palavras de `menor` aparecem em `maior` (palavras inteiras: "sal" não está em "salsicha"). */
function contemPalavras(maior: string, menor: string): boolean {
  const palavras = maior.split(' ')
  return menor.split(' ').every(palavra => palavras.includes(palavra))
}

/**
 * Acha no estoque o item que corresponde a um ingrediente escrito pela IA
 * ("peito de frango" → "Frango"). Prefere nome igual; senão, um que contenha o outro.
 * Devolve todas as linhas do mesmo alimento (podem ter validades diferentes), do que vence primeiro ao último.
 */
export function encontrarNoEstoque(ingrediente: string, itens: Item[]): Item[] {
  const alvo = chave(ingrediente)
  if (alvo.length < 3) return []

  const iguais = itens.filter(item => chave(item.nome) === alvo)
  if (iguais.length) return ordenarPorValidade(iguais)

  const parecidos = ordenarPorValidade(itens).filter(item => {
    const nome = chave(item.nome)
    return nome.length >= 3 && (contemPalavras(alvo, nome) || contemPalavras(nome, alvo))
  })
  if (!parecidos.length) return []

  const primeiro = chave(parecidos[0].nome)
  return parecidos.filter(item => chave(item.nome) === primeiro)
}
