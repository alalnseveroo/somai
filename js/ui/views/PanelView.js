import { formatCurrency } from '../../utils/helpers.js'
import { eventBus } from '../../core/EventBus.js'

export class PanelView {
  constructor(state, services) {
    this.state = state
    this.services = services
    this._subscribe()
  }

  render() {
    const page = document.getElementById('page-panel')
    if (!page) return

    const orders = this.state.get('orders') || []
    const items = this.state.get('orderItems') || []
    const products = this.state.get('products') || []
    const expenses = this.state.get('expenses') || this.state.get('financialExpenses') || []
    const employees = this.state.get('employees') || []

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const isSameMonth = (d) => {
      const dt = new Date(d)
      return dt.getFullYear() === year && dt.getMonth() === month
    }

    const getProduct = (id) => products.find(p => p.id === id) || {}
    const getOrderItems = (orderId) => items.filter(i => i.order_id === orderId)
    const getOrderTotal = (orderId) => {
      return getOrderItems(orderId).reduce((sum, it) => {
        const prodId = typeof it.product_id === 'string' ? parseInt(it.product_id) : it.product_id
        const prod = getProduct(prodId)
        const price = prod.price || 0
        const qty = it.quantity || 1
        return sum + price * qty
      }, 0)
    }

    const completedThisMonth = orders.filter(o => o.status === 'Concluído' && o.created_at && isSameMonth(o.created_at))

    const servicesThisMonth = items.filter(it => {
      const order = orders.find(o => o.id === it.order_id)
      if (!order || order.status !== 'Concluído' || !order.created_at || !isSameMonth(order.created_at)) return false
      const prodId = typeof it.product_id === 'string' ? parseInt(it.product_id) : it.product_id
      const prod = getProduct(prodId)
      return prod && prod.is_product !== true
    }).reduce((acc, it) => acc + (it.quantity || 1), 0)

    const empMap = new Map()
    employees.forEach(e => empMap.set(e.id, e))
    const isBarber = (emp) => {
      const role = (emp?.role || emp?.cargo || '').toString().toLowerCase()
      return role.includes('barb') || role.includes('barbeiro')
    }
    const getEmployeeFromOrder = (o) => {
      const empId = o.employee_id || o.barbeiro_id || o?.employee?.id || null
      if (empId && empMap.has(empId)) return empMap.get(empId)
      if (o.employees) return o.employees
      return null
    }
    const rankingMap = {}
    completedThisMonth.forEach(o => {
      const emp = getEmployeeFromOrder(o)
      if (!emp || !isBarber(emp)) return
      const name = emp.name || emp.full_name || o.employee_name || '—'
      rankingMap[name] = (rankingMap[name] || 0) + getOrderTotal(o.id)
    })
    const ranking = Object.entries(rankingMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5)

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dailyRevenue = Array.from({ length: daysInMonth }, (_, i) => 0)
    completedThisMonth.forEach(o => {
      const d = new Date(o.created_at)
      const day = d.getDate()
      dailyRevenue[day - 1] += getOrderTotal(o.id)
    })

    const dailyExpenses = Array.from({ length: daysInMonth }, (_, i) => 0)
    expenses.filter(e => e.date && isSameMonth(e.date)).forEach(e => {
      const d = new Date(e.date)
      const day = d.getDate()
      const value = e.amount || e.value || 0
      dailyExpenses[day - 1] += Math.abs(value)
    })

    const chartWidth = 600
    const chartHeight = 160
    const maxRev = Math.max(...dailyRevenue, 1)
    const points = dailyRevenue.map((v, i) => {
      const x = (i / (daysInMonth - 1)) * chartWidth
      const y = chartHeight - (v / maxRev) * chartHeight
      return `${x},${y}`
    }).join(' ')

    const maxAbs = Math.max(...dailyRevenue, ...dailyExpenses, 1)
    const bars = dailyRevenue.map((rev, i) => {
      const exp = dailyExpenses[i]
      const x = (i / daysInMonth) * (chartWidth) + 4
      const barW = Math.max(2, chartWidth / daysInMonth - 6)
      const revH = (rev / maxAbs) * chartHeight
      const expH = (exp / maxAbs) * chartHeight
      const revRect = `<rect x="${x}" y="${chartHeight - revH}" width="${barW}" height="${revH}" fill="#34d399" rx="2" />`
      const expRect = `<rect x="${x}" y="${chartHeight}" width="${barW}" height="${expH}" fill="#f87171" rx="2" transform="scale(1,-1) translate(0,-${chartHeight * 2})" />`
      return revRect + expRect
    }).join('')

    page.innerHTML = `
      <div class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-xl shadow-sm p-5">
            <h3 class="text-sm font-semibold text-slate-800 mb-3">Ranking dos Barbeiros</h3>
            <div class="space-y-2">
              ${ranking.length ? ranking.map((r, idx) => `
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center justify-center">${idx + 1}</span>
                    <span class="text-sm text-slate-800">${r.name}</span>
                  </div>
                  <span class="text-sm font-semibold text-slate-900">${formatCurrency(r.total)}</span>
                </div>
              `).join('') : '<p class="text-sm text-slate-500">Sem dados neste mês</p>'}
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5">
            <h3 class="text-sm font-semibold text-slate-800 mb-3">Total de serviços no mês</h3>
            <p class="text-2xl font-bold text-slate-900">${servicesThisMonth}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5">
            <h3 class="text-sm font-semibold text-slate-800 mb-3">Faturamento diário (linha)</h3>
            <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full h-40">
              <polyline points="${points}" fill="none" stroke="#4f46e5" stroke-width="2" />
            </svg>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-3">Faturamento vs Gastos</h3>
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full h-48">
            ${bars}
          </svg>
          <div class="flex items-center gap-4 mt-2 text-xs">
            <span class="inline-flex items-center gap-2"><span class="w-3 h-3 rounded bg-emerald-400"></span>Faturamento</span>
            <span class="inline-flex items-center gap-2"><span class="w-3 h-3 rounded bg-red-400"></span>Gastos</span>
          </div>
        </div>
      </div>
    `

    if (typeof lucide !== 'undefined') {
      lucide.createIcons()
    }
  }
  _subscribe() {
    const rerenderIfVisible = () => {
      const el = document.getElementById('page-panel')
      if (el && !el.classList.contains('hidden')) {
        this.render()
      }
    }
    ;['order:created','order:updated','order:deleted','orders:refreshed','expenses:created','expenses:updated','expenses:deleted','products:updated','order_items:updated','inventory:updated'].forEach(ev => {
      eventBus.on(ev, rerenderIfVisible)
    })
  }
}