export interface Item {
    id: number,
    nome: string,
    quantidade: number,
    categoria: number,
    local: number,
    usuario_id?: number,
    ids?: number[],
    /** linhas originais do banco que compõem um item agrupado por nome, do que vence primeiro ao último */
    linhas?: Item[],
    /** campos retornados pela API ao listar itens (GET /itens) */
    categoria_id?: number,
    local_id?: number,
    unidade: string,
    quantidade_minima: number,
    /** YYYY-MM-DD; sem data o item nunca aparece em "vence em breve" */
    data_validade?: string | null
}
