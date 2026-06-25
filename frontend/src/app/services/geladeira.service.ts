import { Injectable } from '@angular/core';
import { Item } from '../models/item.model';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class GeladeiraService {

    private api = environment.apiUrl

    constructor(private http: HttpClient){}

    addItemBD(item: Item){
        return this.http.post(`${this.api}/itens`, item)
    }

    getItemBD(id: number): Observable<Item>{
        return this.http.get<Item>(`${this.api}/itens/${id}`)
    }

    updateItemBD(id: number, item: Item){
        return this.http.put(`${this.api}/itens/${id}`, item)
    }

    getItensBD(localId?: number): Observable<Item[]>{
        console.log("Chamando API /itens")
        const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
        const params: Record<string, string | number> = { usuario_id: usuario?.id ?? '' }
        if (localId) {
            params['local_id'] = localId
        }
        return this.http.get<Item[]>(`${this.api}/itens`, { params })
    }

    getCategoriasBD(): Observable<{id: number, nome: string}[]>{
        return this.http.get<{id: number, nome: string}[]>(`${this.api}/categorias`)
    }


    /*lista comeca vazia*/
    private itensSubject = new BehaviorSubject<Item[]> (
        [
        {id:1, nome: "Leite", quantidade: 1, categoria: 1, local: 1, unidade: 'un', quantidade_minima: 1},
        {id:2, nome: "Arroz", quantidade: 2, categoria: 2, local: 2, unidade: 'un', quantidade_minima: 1},
        {id:3, nome: "Frango", quantidade: 1, categoria: 3, local: 3, unidade: 'un', quantidade_minima: 1}

    ]
    )   

    private itensFiltradosSubject = new BehaviorSubject<Item[]>(this.itensSubject.value)
    
    itensFiltrados$ = this.itensFiltradosSubject.asObservable()

    private categorias = [

        {
            id: 1, nome: "Laticinios"
        },

        {
            id: 2, nome: "Verduras"
        },

        {
            id: 3, nome: 'Bebidas'
        }
    
    ]

    private local = [
        {
            id: 1, nome: 'geladeira'
        },
        {
            id: 2, nome: 'freezer'
        },
        {
            id:3, nome: 'despensa'
        }
    ]

    categoriaSelecionada = ''

    itens$ = this.itensSubject.asObservable();

    getItens(){
        return this.itensSubject.value
    }

    addItem(item: Item): void{
        console.log("Item", item)
        const atual = this.itensSubject.value
        /*define proximo estado dele, copia a antiga e adiciona o novo item*/
        this.itensSubject.next([...atual, item])
    }

    removeItem(id: number) {
    return this.http.delete(`${this.api}/itens/${id}`);
    }

    totalItens$ = this.itensSubject.pipe(
    map(itens => itens.length)
    );

    getCategorias(){
        return this.categorias
    }

    getLocais(){
        return this.local
    }

    selecionarCategoria(categoria: string){
        this.categoriaSelecionada = categoria
    }

    filtrarItens(categoriaId: number) {
    const filtrados = this.itensSubject.value.filter(
        item => item.categoria === categoriaId
    );

    this.itensFiltradosSubject.next(filtrados);
    }

    resetFiltro(){
        this.itensFiltradosSubject.next(this.itensSubject.value)
    }

    uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post(`${this.api}/vision`, formData);
    }

    gerarReceita(usuarioId: number, localId?: number, itemIds?: number[]): Observable<{ receita: Receita }>{
        const body: { usuario_id: number, local_id?: number, item_ids?: number[] } = { usuario_id: usuarioId }
        if (itemIds?.length) {
            body.item_ids = itemIds
        } else if (localId) {
            body.local_id = localId
        }
        return this.http.post<{ receita: Receita }>(`${this.api}/gerar-receita`, body)
    }
}

export interface Receita {
    titulo: string
    tempoPreparo?: string
    porcoes?: number
    ingredientesUsados?: string[]
    ingredientesFaltantes?: string[]
    modoPreparo?: string[]
}