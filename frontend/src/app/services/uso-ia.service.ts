import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsoIA {
  usosIA: number
  /** null = conta sem limite */
  limiteIA: number | null
}

@Injectable({
  providedIn: 'root'
})
export class UsoIAService {

  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  obter(): Observable<UsoIA> {
    return this.http.get<UsoIA>(`${this.api}/uso-ia`)
  }
}
