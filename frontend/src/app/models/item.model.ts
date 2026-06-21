export interface Item {
    id: number,
    nome: string,
    quantidade: number,
    categoria: number,
    local: number,
    usuario_id?: number,
    ids?: number[]
}