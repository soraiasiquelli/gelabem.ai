import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-formulario-ler-nota',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-ler-nota.html',
  styleUrl: './formulario-ler-nota.css',
})
export class FormularioLerNota {

  carregando = false
  itensDetectados: any[] = []
  mensagem = ''
  statusTipo: 'sucesso' | 'erro' | '' = ''

  constructor(private http: HttpClient) {}

  onFile(event: any) {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("image", file)

    this.carregando = true
    this.itensDetectados = []
    this.mensagem = ''

    this.http.post<any>(`${environment.apiUrl}/leitura-nota`, formData)
      .subscribe({
        next: (res) => {
          this.carregando = false
          this.itensDetectados = res.resultado || []
          if (!this.itensDetectados.length) {
            this.mensagem = 'Nenhum item encontrado na nota.'
            this.statusTipo = 'erro'
          }
        },
        error: (error) => {
          console.log("Erro:", error)
          this.carregando = false
          this.mensagem = 'Erro ao processar a nota fiscal.'
          this.statusTipo = 'erro'
        }
      })
  }

  adicionarItem(item: any, index: number) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario) return

    this.http.post(`${environment.apiUrl}/itens`, {
      nome: item.nome,
      quantidade: item.quantidade,
      unidade: item.unidade || 'un',
      categoria: item.categoria_id,
      local: 1, // ajusta para o local correto
      usuario_id: usuario.id
    }).subscribe({
      next: () => {
        this.itensDetectados.splice(index, 1)
        this.mensagem = 'Item adicionado!'
        this.statusTipo = 'sucesso'
      },
      error: () => {
        this.mensagem = 'Erro ao adicionar item.'
        this.statusTipo = 'erro'
      }
    })
  }

  adicionarTodos() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario || !this.itensDetectados.length) return

    const requisicoes = this.itensDetectados.map(item =>
      this.http.post(`${environment.apiUrl}/itens`, {
        nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade || 'un',
        categoria: item.categoria_id,
        local: 1, // ajusta para o local correto
        usuario_id: usuario.id
      })
    )

    // envia todos de uma vez
    let concluidos = 0
    requisicoes.forEach(req => {
      req.subscribe({
        next: () => {
          concluidos++
          if (concluidos === requisicoes.length) {
            this.itensDetectados = []
            this.mensagem = `${concluidos} item(s) adicionado(s) com sucesso!`
            this.statusTipo = 'sucesso'
          }
        },
        error: () => {
          this.mensagem = 'Erro ao adicionar alguns itens.'
          this.statusTipo = 'erro'
        }
      })
    })
  }
}