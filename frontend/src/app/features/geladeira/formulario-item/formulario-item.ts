import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeladeiraService } from '../../../services/geladeira.service';
import { LoginService } from '../../../services/auth/login.service';
import { Item } from '../../../models/item.model';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-formulario-item',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulario-item.html',
  styleUrl: './formulario-item.css',
})
export class FormularioItem implements OnInit {

  @Input() itemId?: number

   nome = ''
   quantidade = 1
   categoria = 0
   local = 0
   unidade = 'un'
   quantidade_minima = 1

  categorias: {id: number, nome: string}[] = [];
  locais: {id: number, nome: string}[] = []

  analisando = false
  mensagemIA = ''
  itensDetectados: {nome: string, quantidade: number, categoria: number}[] = []

  mensagemStatus = ''
  statusTipo: 'sucesso' | 'erro' | '' = ''

  mostrarStatus(mensagem: string, tipo: 'sucesso' | 'erro') {
    this.mensagemStatus = mensagem
    this.statusTipo = tipo
    this.cdr.markForCheck()
    setTimeout(() => {
      this.mensagemStatus = ''
      this.statusTipo = ''
      this.cdr.markForCheck()
    }, 3000)
  }

    constructor (private geladeiraService: GeladeiraService, private loginService: LoginService, private http:HttpClient, private cdr: ChangeDetectorRef, private route: ActivatedRoute){
      this.geladeiraService.getCategoriasBD().subscribe(categorias => {
        this.categorias = categorias
        if (!this.categoria) {
          this.categoria = categorias[0]?.id ?? 0
        }
        this.cdr.markForCheck()
      })

      const tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'

      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
      if (usuario) {
        this.loginService.getArmazenamentos(usuario.id).subscribe(locais => {
          this.locais = locais
          const localDoTipo = locais.find(loc => loc.nome === tipo)
          this.local = localDoTipo?.id ?? 0
          this.cdr.markForCheck()
        })
      }
    }

    ngOnInit() {
      if (!this.itemId) return

      this.geladeiraService.getItemBD(this.itemId).subscribe(item => {
        this.nome = item.nome
        this.quantidade = item.quantidade
        this.categoria = item.categoria_id ?? this.categoria
        this.local = item.local_id ?? this.local
        this.unidade = item.unidade
        this.quantidade_minima = item.quantidade_minima
        this.cdr.markForCheck()
      })
    }

    adicionar(){
      if (!this.local) {
        this.mostrarStatus('Esse armazenamento não está configurado pra esse usuário.', 'erro')
        return
      }

      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

      const novoItem: Item = {
        id: Date.now(),
        nome: this.nome,
        quantidade: this.quantidade,
        categoria: Number(this.categoria),
        local:Number(this.local),
        usuario_id: usuario?.id,
        unidade: this.unidade,
        quantidade_minima: this.quantidade_minima

      }

      console.log("Novo Item:", novoItem)
      const request = this.itemId
        ? this.geladeiraService.updateItemBD(this.itemId, novoItem)
        : this.geladeiraService.addItemBD(novoItem)

      request.subscribe({
        next: (res) => {
          console.log("Salvo no banco:", res);
          this.mensagemIA = ''
          this.mostrarStatus(this.itemId ? 'Item atualizado com sucesso!' : 'Item salvo com sucesso!', 'sucesso')
        },
        error: (err) => {
          console.log("Erro:", err);
          this.mostrarStatus(err.error?.error || 'Erro ao salvar item. Tente novamente.', 'erro')
        }
      });

      if (!this.itemId) {
        this.nome = ''
        this.quantidade = 1
        this.categoria = this.categorias[0]?.id ?? 0
      }
    }

    adicionarDetectado(item: {nome: string, quantidade: number, categoria: number}, index: number){
      if (!this.local) {
        this.mostrarStatus('Esse armazenamento não está configurado pra esse usuário.', 'erro')
        return
      }

      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

      const novoItem: Item = {
        id: Date.now(),
        nome: item.nome,
        quantidade: item.quantidade,
        categoria: Number(item.categoria),
        local: Number(this.local),
        usuario_id: usuario?.id,
        unidade: this.unidade,
        quantidade_minima: this.quantidade_minima
      }

      this.geladeiraService.addItemBD(novoItem)
        .subscribe({
          next: (res) => {
            console.log("Salvo no banco:", res);
            this.itensDetectados.splice(index, 1)
            this.mostrarStatus('Item salvo com sucesso!', 'sucesso')
          },
          error: (err) => {
            console.log("Erro:", err);
            this.mostrarStatus(err.error?.error || 'Erro ao salvar item. Tente novamente.', 'erro')
          }
        });
    }

onFile(event: any) {
  const file = event.target.files[0];
  if (!file) return

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  if (!usuario) {
    this.mensagemIA = 'Você precisa estar logado para usar a IA.'
    return
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("usuario_id", String(usuario.id));

  this.analisando = true
  this.mensagemIA = ''
  this.itensDetectados = []

  this.http.post<{ resultado: { nome: string, categoria: string, quantidade: number }[], usosIA: number, limiteIA: number }>(`${environment.apiUrl}/vision`, formData)
    .subscribe({
      next: (res) => {
        console.log("IA respondeu:", res);
        this.analisando = false
        const itens = res.resultado || []

        if (!itens.length) {
          this.mensagemIA = 'Nenhum alimento foi identificado na imagem.'
          this.cdr.markForCheck()
          return
        }

        this.itensDetectados = itens.map(item => {
          const categoriaEncontrada = this.categorias.find(
            c => c.nome.toLowerCase() === item.categoria?.toLowerCase()
          )
          return {
            nome: item.nome,
            quantidade: item.quantidade || 1,
            categoria: categoriaEncontrada?.id || 0
          }
        })

        const restantes = res.limiteIA != null ? res.limiteIA - res.usosIA : null
        this.mensagemIA = `${itens.length} item(ns) identificado(s). Confira e clique em Adicionar em cada um.`
          + (restantes != null ? ` (${restantes} análise(s) grátis restante(s))` : '')
        this.cdr.markForCheck()
      },
      error: (err) => {
        console.log("Erro:", err);
        this.analisando = false
        this.mensagemIA = (err.status === 403 || err.status === 503)
          ? (err.error?.error || 'Não foi possível analisar a imagem.')
          : 'Não foi possível analisar a imagem.'
        this.cdr.markForCheck()
      }
    });
}
   
}
