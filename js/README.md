# Arquitetura Modular - Somai

## 📁 Estrutura do Projeto

```
js/
├── core/                    # Núcleo da aplicação
│   ├── AppState.js         # Gerenciamento de estado global
│   └── EventBus.js         # Sistema de eventos pub/sub
│
├── services/               # Lógica de negócio
│   ├── SupabaseService.js # Camada de abstração do banco
│   ├── AuthService.js      # Autenticação e autorização
│   ├── OrderService.js     # Gestão de pedidos
│   ├── CustomerService.js  # Gestão de clientes
│   └── ...                 # Outros serviços
│
├── controllers/            # Orquestração UI ↔ Services
│   ├── OrderController.js
│   ├── CustomerController.js
│   └── ...
│
├── ui/                     # Componentes de interface
│   ├── UIManager.js        # Gerenciador principal da UI
│   ├── components/         # Componentes reutilizáveis
│   └── views/              # Views de páginas
│
├── utils/                  # Utilitários
│   ├── helpers.js          # Funções auxiliares
│   ├── validators.js       # Validações
│   └── formatters.js       # Formatadores
│
├── config/                 # Configurações
│   ├── constants.js        # Constantes
│   └── supabase.js         # Config Supabase
│
└── Application.js          # Ponto de entrada principal
```

## 🏗️ Padrões Arquiteturais

### 1. **Separação de Responsabilidades**

- **Core**: Estado e eventos centralizados
- **Services**: Lógica de negócio pura, sem dependência de UI
- **Controllers**: Orquestração entre UI e Services
- **UI**: Apenas renderização e interação do usuário

### 2. **State Management**

```javascript
// AppState - Gerencia todo o estado da aplicação
const state = new AppState();

// Get
const user = state.get('currentUser');
const orders = state.get('orders');

// Set
state.set('currentUser', user);
state.set('orders', ordersList);

// Subscribe (reatividade)
state.subscribe('orders', (newOrders, oldOrders) => {
  console.log('Orders changed!');
});
```

### 3. **Event Bus (Pub/Sub)**

```javascript
import { eventBus } from './core/EventBus.js';

// Publicar evento
eventBus.emit('order:created', orderData);

// Escutar evento
eventBus.on('order:created', (orderData) => {
  console.log('Nova ordem criada:', orderData);
});
```

### 4. **Services**

Cada serviço é responsável por uma entidade do domínio:

```javascript
// OrderService
const orderService = new OrderService(dbService, appState);
await orderService.create(orderData);
await orderService.update(orderId, updates);
await orderService.cancel(orderId);
```

## 🎯 Benefícios da Arquitetura

### ✅ **Modularidade**
- Código organizado em módulos independentes
- Fácil localização de funcionalidades
- Reutilização de código

### ✅ **Escalabilidade**
- Fácil adicionar novos recursos
- Estrutura preparada para crescimento
- Separação clara de responsabilidades

### ✅ **Testabilidade**
- Services podem ser testados isoladamente
- Mock de dependências facilitado
- Testes unitários e de integração

### ✅ **Manutenibilidade**
- Código mais legível e organizado
- Mudanças localizadas
- Menos bugs e regressões

### ✅ **Desacoplamento**
- Componentes independentes
- Comunicação via eventos
- Fácil substituição de implementações

## 🚀 Como Usar

### Inicialização

A aplicação é inicializada automaticamente quando o DOM está pronto:

```javascript
// Application.js já faz isso
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new Application();
  await window.app.init();
});
```

### Acessar Serviços

```javascript
// Todos os serviços estão disponíveis em window.app.services
const { order, customer, auth } = window.app.services;

// Criar pedido
await order.create({
  customer_id: 123,
  items: [...],
  payment_method: 'Dinheiro'
});

// Buscar clientes
const customers = await customer.getAll();
```

### Gerenciar Estado

```javascript
// State global
const state = window.app.state;

// Ler
const orders = state.get('orders');

// Escrever
state.set('orders', newOrders);

// Observar mudanças
state.subscribe('orders', (orders) => {
  console.log('Pedidos atualizados:', orders);
});
```

### Emitir Eventos

```javascript
import { eventBus } from './core/EventBus.js';

// Emitir
eventBus.emit('custom:event', data);

// Escutar
eventBus.on('custom:event', (data) => {
  // Handler
});
```

## 📝 Convenções

### Nomenclatura

- **Services**: `NomeService.js` (ex: `OrderService.js`)
- **Controllers**: `NomeController.js`
- **Componentes**: `NomeComponent.js`
- **Utils**: snake_case ou camelCase

### Estrutura de Métodos

```javascript
class ExampleService {
  // Públicos (sem _)
  async create(data) {}
  async update(id, data) {}
  
  // Privados (com _)
  _validate(data) {}
  _formatData(data) {}
}
```

### Eventos

Padrão: `entidade:ação`

```javascript
'order:created'
'order:updated'
'order:cancelled'
'auth:login'
'auth:logout'
'data:loaded'
```

## 🔄 Fluxo de Dados

```
User Action (UI)
    ↓
Controller
    ↓
Service (Business Logic)
    ↓
SupabaseService (Data Layer)
    ↓
Database
    ↓
State Update
    ↓
EventBus Notification
    ↓
UI Update
```

## 💰 Gestão de Sessões de Caixa

A aplicação agora inclui um sistema robusto de gestão de sessões de caixa que permite:

### Funcionalidades:
- **Abertura e fechamento de caixa** com valores de abertura
- **Vinculação de pedidos às sessões de caixa** através do campo `caixa_sessao_id`
- **Relatórios por sessão** para controle financeiro
- **Compartilhamento de dados** entre funcionários e administradores

### Estrutura:
```sql
-- Tabela caixa_sessoes
id BIGSERIAL PRIMARY KEY
user_id UUID NOT NULL REFERENCES auth.users(id)
valor_abertura NUMERIC(10, 2) NOT NULL
valor_fechamento NUMERIC(10, 2)
valor_apurado_dinheiro NUMERIC(10, 2)
data_abertura TIMESTAMPTZ DEFAULT NOW()
data_fechamento TIMESTAMPTZ

-- Campo adicionado à tabela orders
caixa_sessao_id BIGINT REFERENCES public.caixa_sessoes(id)
```

### Fluxo de Trabalho:
1. **Funcionário abre o caixa** informando valor inicial
2. **Sistema registra sessão ativa** no estado da aplicação
3. **Pedidos são vinculados automaticamente** à sessão ativa
4. **Administradores podem visualizar** todas as sessões e pedidos
5. **Funcionário fecha o caixa** informando valor final
6. **Sistema calcula totais** e gera relatórios

### Eventos:
```javascript
'cash:session-opened'  // Nova sessão de caixa aberta
'cash:session-closed'  // Sessão de caixa fechada
'order:created'        // Pedido criado (com caixa_sessao_id)
```

## 🎨 Adicionar Novo Recurso

### 1. Criar Service

```javascript
// js/services/ProductService.js
export class ProductService {
  constructor(dbService, appState) {
    this.db = dbService;
    this.state = appState;
  }

  async create(data) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
}
```

### 2. Registrar no Application

```javascript
// js/Application.js
this.services = {
  // ... existing services
  product: new ProductService(dbService, this.state)
};
```

### 3. Criar Controller (opcional)

```javascript
// js/controllers/ProductController.js
export class ProductController {
  constructor(productService, uiManager) {
    this.service = productService;
    this.ui = uiManager;
  }

  async handleCreate(formData) { /* ... */ }
}
```

### 4. Criar View

```javascript
// js/ui/views/ProductView.js
export class ProductView {
  render(products) { /* ... */ }
}
```

## 🔧 Migração do Código Legado

Para migrar funcionalidades do `app.js` antigo:

1. Identificar a responsabilidade (UI, lógica, dados)
2. Mover lógica de negócio para Services
3. Mover renderização para Views
4. Conectar via Controller se necessário
5. Usar EventBus para comunicação

## 📚 Referências

- **State Management**: Padrão Observer
- **Event Bus**: Padrão Pub/Sub
- **Services**: Service Layer Pattern
- **Separation of Concerns**: SOLID Principles
