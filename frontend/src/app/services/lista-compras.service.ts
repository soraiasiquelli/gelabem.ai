import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ItemListaCompras {
  id?: number;
  nome: string;
  quantidade: number;
  unidade: string;
  comprado?: boolean;
  usuario_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ListaComprasService {

  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  private get usuarioId(): number | null {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    return usuario?.id ?? null
  }

  getItensBD(): Observable<ItemListaCompras[]> {
    return this.http.get<ItemListaCompras[]>(`${this.api}/lista-compras`, {
      params: { usuario_id: this.usuarioId ?? '' }
    })
  }

  addItemBD(item: Pick<ItemListaCompras, 'nome' | 'quantidade' | 'unidade'>) {
    return this.http.post<ItemListaCompras>(`${this.api}/lista-compras`, {
      ...item,
      usuario_id: this.usuarioId
    })
  }

  marcarCompradoBD(id: number, comprado: boolean) {
    return this.http.put<ItemListaCompras>(`${this.api}/lista-compras/${id}`, { comprado })
  }

  removeItemBD(id: number) {
    return this.http.delete(`${this.api}/lista-compras/${id}`)
  }
}
