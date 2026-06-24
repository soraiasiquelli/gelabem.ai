import { ChangeDetectorRef, Component } from '@angular/core';
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
export class FormularioItem {

   nome = ''
   quantidade = 0
   categoria = 0
   local = 0

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
        this.cdr.markForCheck()
      })

      const tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'

      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
      if (usuario) {
        this.loginService.getArmazenamentos(usuario.id).subscribe(locais => {
          this.locais = locais
          const localDoTipo = locais.find(loc => loc.nome === tipo)
          this.local = localDoTipo ? localDoTipo.id : (locais[0]?.id ?? 0)
          this.cdr.markForCheck()
        })
      }
    }

    adicionar(){
      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

      const novoItem: Item = {
        id: Date.now(),
        nome: this.nome,
        quantidade: this.quantidade,
        categoria: Number(this.categoria),
        local:Number(this.local),
        usuario_id: usuario?.id

      }

      console.log("Novo Item:", novoItem)
     this.geladeiraService.addItemBD(novoItem)
    .subscribe({
      next: (res) => {
        console.log("Salvo no banco:", res);
        this.mensagemIA = ''
        this.mostrarStatus('Item salvo com sucesso!', 'sucesso')
      },
      error: (err) => {
        console.log("Erro:", err);
        this.mostrarStatus(err.error?.error || 'Erro ao salvar item. Tente novamente.', 'erro')
      }
    });

      this.nome = ''
      this.quantidade = 0
      this.categoria = 0

    }

    adicionarDetectado(item: {nome: string, quantidade: number, categoria: number}, index: number){
      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')

      const novoItem: Item = {
        id: Date.now(),
        nome: item.nome,
        quantidade: item.quantidade,
        categoria: Number(item.categoria),
        local: Number(this.local),
        usuario_id: usuario?.id
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
