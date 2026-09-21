import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeladeiraService } from '../../../services/geladeira.service';
import { LoginService } from '../../../services/auth/login.service';
import { Item } from '../../../models/item.model';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { dataEmDias } from '../../../utils/validade';
import { TPipe } from '../../../i18n/t.pipe';
import { tr } from '../../../i18n/i18n.service';
import { registrarEvento } from '../../../analytics/analytics.service';

interface ItemDetectado {
  nome: string
  quantidade: number
  categoria: number
  confianca: 'alta' | 'baixa'
  /** YYYY-MM-DD; começa com a estimativa da IA e o usuário pode corrigir */
  data_validade: string
  /** true enquanto a data ainda é a estimativa da IA (pra avisar que é um palpite) */
  validadeEstimada: boolean
}

@Component({
  selector: 'app-formulario-item',
  standalone: true,
  imports: [TPipe, FormsModule],
  templateUrl: './formulario-item.html',
  styleUrl: './formulario-item.css',
})
export class FormularioItem implements OnInit {

  @Input() itemId?: number

  /** o onboarding esconde "Cancelar": voltar levaria de novo à tela de cadastro */
  @Input() mostrarCancelar = true

  /** avisa a tela que envolve o formulário (ex.: onboarding) que um item foi salvo */
  @Output() salvo = new EventEmitter<void>()

   nome = ''
   quantidade = 1
   categoria = 0
   local = 0
   unidade = 'un'
   quantidade_minima = 1
   data_validade = ''

  /** atalhos "+3 dias", "+1 semana"... ao lado do campo de validade */
  atalhosValidade = [
    { label: '+3 dias', dias: 3 },
    { label: '+1 semana', dias: 7 },
    { label: '+2 semanas', dias: 14 },
    { label: '+1 mês', dias: 30 },
  ]

  categorias: {id: number, nome: string}[] = [];
  locais: {id: number, nome: string}[] = []

  private tipo = 'geladeira'

  analisando = false
  mensagemIA = ''
  itensDetectados: ItemDetectado[] = []

  get itensCertos() {
    return this.itensDetectados.filter(i => i.confianca === 'alta')
  }
  get itensIncertos() {
    return this.itensDetectados.filter(i => i.confianca === 'baixa')
  }

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

    constructor (private geladeiraService: GeladeiraService, private loginService: LoginService, private http:HttpClient, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private location: Location){
      this.geladeiraService.getCategoriasBD().subscribe(categorias => {
        this.categorias = categorias
        if (!this.categoria) {
          this.categoria = categorias[0]?.id ?? 0
        }
        this.cdr.markForCheck()
      })

      const tipo = this.route.snapshot.paramMap.get('tipo') || 'geladeira'
      this.tipo = tipo

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
        this.data_validade = item.data_validade ?? ''
        this.cdr.markForCheck()
      })
    }

    definirValidadeEm(dias: number, alvo: { data_validade: string, validadeEstimada?: boolean } = this) {
      alvo.data_validade = dataEmDias(dias)
      if ('validadeEstimada' in alvo) alvo.validadeEstimada = false
    }

    limparValidade(alvo: { data_validade: string, validadeEstimada?: boolean } = this) {
      alvo.data_validade = ''
      if ('validadeEstimada' in alvo) alvo.validadeEstimada = false
    }

    adicionar(){
      if (!this.local) {
        this.mostrarStatus(tr('Esse armazenamento não está configurado pra esse usuário.'), 'erro')
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
        quantidade_minima: this.quantidade_minima,
        data_validade: this.data_validade || null

      }

      console.log("Novo Item:", novoItem)
      const request = this.itemId
        ? this.geladeiraService.updateItemBD(this.itemId, novoItem)
        : this.geladeiraService.addItemBD(novoItem)

      request.subscribe({
        next: (res) => {
          console.log("Salvo no banco:", res);
          this.mensagemIA = ''
          if (!this.itemId) registrarEvento('item_added')
          this.mostrarStatus(this.itemId ? tr('Item atualizado com sucesso!') : tr('Item salvo com sucesso!'), 'sucesso')
          this.salvo.emit()
        },
        error: (err) => {
          console.log("Erro:", err);
          this.mostrarStatus(err.error?.error || tr('Erro ao salvar item. Tente novamente.'), 'erro')
        }
      });

      if (!this.itemId) {
        this.nome = ''
        this.quantidade = 1
        this.categoria = this.categorias[0]?.id ?? 0
        this.data_validade = ''
      }
    }

    adicionarDetectado(item: ItemDetectado){
      if (!this.local) {
        this.mostrarStatus(tr('Esse armazenamento não está configurado pra esse usuário.'), 'erro')
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
        quantidade_minima: this.quantidade_minima,
        data_validade: item.data_validade || null
      }

      this.geladeiraService.addItemBD(novoItem)
        .subscribe({
          next: (res) => {
            console.log("Salvo no banco:", res);
            this.descartarDetectado(item)
            registrarEvento('item_added', { origem: 'ia' })
            this.mostrarStatus(tr('Item salvo com sucesso!'), 'sucesso')
            this.salvo.emit()
          },
          error: (err) => {
            console.log("Erro:", err);
            this.mostrarStatus(err.error?.error || tr('Erro ao salvar item. Tente novamente.'), 'erro')
          }
        });
    }

    descartarDetectado(item: ItemDetectado){
      this.itensDetectados = this.itensDetectados.filter(i => i !== item)
    }

    cancelar(){
      this.location.back()
    }

onFile(event: any) {
  const file = event.target.files[0];
  if (!file) return

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
  if (!usuario) {
    this.mensagemIA = tr('Você precisa estar logado para usar a IA.')
    return
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("usuario_id", String(usuario.id));
  // a validade estimada depende de onde o alimento fica (geladeira x freezer x despensa)
  formData.append("local", this.tipo);

  this.analisando = true
  this.mensagemIA = ''
  this.itensDetectados = []

  this.http.post<{ resultado: { nome: string, categoria: string, quantidade: number, confianca?: 'alta' | 'baixa', validade_sugerida?: string | null }[], usosIA: number, limiteIA: number }>(`${environment.apiUrl}/vision`, formData)
    .subscribe({
      next: (res) => {
        console.log("IA respondeu:", res);
        this.analisando = false
        const itens = res.resultado || []

        if (!itens.length) {
          this.mensagemIA = tr('Nenhum alimento foi identificado na imagem.')
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
            categoria: categoriaEncontrada?.id || 0,
            confianca: item.confianca === 'baixa' ? 'baixa' as const : 'alta' as const,
            data_validade: item.validade_sugerida ?? '',
            validadeEstimada: !!item.validade_sugerida
          }
        })

        const restantes = res.limiteIA != null ? res.limiteIA - res.usosIA : null
        this.mensagemIA = tr('{n} item(ns) identificado(s). Confira e confirme cada um.', { n: itens.length })
          + (restantes != null ? ' ' + tr('({n} uso(s) de IA restante(s) neste mês)', { n: restantes }) : '')
        this.cdr.markForCheck()
      },
      error: (err) => {
        console.log("Erro:", err);
        this.analisando = false
        this.mensagemIA = (err.status === 403 || err.status === 503)
          ? (err.error?.error || tr('Não foi possível analisar a imagem.'))
          : tr('Não foi possível analisar a imagem.')
        this.cdr.markForCheck()
      }
    });
}

}
