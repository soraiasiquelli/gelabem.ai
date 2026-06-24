export interface Item {
    id: number,
    nome: string,
    quantidade: number,
    categoria: number,
    local: number,
    usuario_id?: number,
    ids?: number[],
    /** campos retornados pela API ao listar itens (GET /itens) */
    categoria_id?: number,
    local_id?: number
}