<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.budget') }}</h3>
          <span class="budget-value">{{ money(budget) }}</span>
        </div>
        <input
          v-model.number="budget"
          class="budget-slider"
          type="range"
          min="0"
          :max="maxBudget"
          :step="budgetStep"
          :disabled="maxBudget === 0"
          :aria-label="t('restocking.budget')"
        />
        <div class="slider-scale">
          <span>{{ money(0) }}</span>
          <span>{{ money(maxBudget) }}</span>
        </div>
        <p class="hint">{{ t('restocking.budgetHint') }}</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card info">
          <div class="stat-label">{{ t('restocking.totalCost') }}</div>
          <div class="stat-value">{{ money(totalCost) }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t('restocking.remaining') }}</div>
          <div class="stat-value">{{ money(remainingBudget) }}</div>
        </div>
      </div>

      <div v-if="orderSuccess" class="success-message">{{ orderSuccess }}</div>
      <div v-if="orderError" class="error">{{ orderError }}</div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('restocking.selectedItems') }} ({{ selectedItems.length }})</h3>
          <button
            class="place-order-btn"
            :disabled="selectedItems.length === 0 || submitting"
            @click="placeOrder"
          >
            {{ submitting ? t('restocking.submitting') : t('restocking.placeOrder') }}
          </button>
        </div>

        <div v-if="recommendations.length === 0" class="empty-state">
          {{ t('restocking.noRecommendations') }}
        </div>
        <div v-else-if="selectedItems.length === 0" class="empty-state">
          {{ t('restocking.empty') }}
        </div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t('restocking.table.sku') }}</th>
                <th>{{ t('restocking.table.name') }}</th>
                <th>{{ t('restocking.table.trend') }}</th>
                <th class="num">{{ t('restocking.table.quantity') }}</th>
                <th class="num">{{ t('restocking.table.unitCost') }}</th>
                <th class="num">{{ t('restocking.table.lineCost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedItems" :key="item.sku">
                <td><strong>{{ item.sku }}</strong></td>
                <td>{{ translateProductName(item.name) }}</td>
                <td>
                  <span :class="['badge', item.trend]">{{ t(`trends.${item.trend}`) }}</span>
                </td>
                <td class="num">{{ item.recommended_quantity }}</td>
                <td class="num">
                  {{ money(item.unit_cost, 2) }}
                  <span v-if="item.cost_estimated" class="estimated" :title="t('restocking.estimatedNote')">
                    * {{ t('restocking.estimatedBadge') }}
                  </span>
                </td>
                <td class="num"><strong>{{ money(item.line_cost, 2) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="hasEstimated" class="hint">{{ t('restocking.estimatedNote') }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'
import { formatCurrencyWithDecimals } from '../utils/currency'

export default {
  name: 'Restocking',
  setup() {
    const { t, currentCurrency, currentLocale, translateProductName } = useI18n()

    const loading = ref(true)
    const error = ref(null)
    const recommendations = ref([])
    const budget = ref(0)
    const submitting = ref(false)
    const orderSuccess = ref(null)
    const orderError = ref(null)

    // All amounts from the API are USD; formatCurrency converts for JPY display
    const money = (amount, decimals = 0) =>
      formatCurrencyWithDecimals(amount, currentCurrency.value, decimals)

    // Slider upper bound: cost of buying every recommendation, rounded up to whole dollars
    const maxBudget = computed(() =>
      Math.ceil(recommendations.value.reduce((sum, r) => sum + r.line_cost, 0))
    )

    // Roughly 100 slider stops, snapped to a "nice" step (1, 10, 100, ...)
    const budgetStep = computed(() =>
      Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(maxBudget.value, 1) / 100))))
    )

    // Greedy pass in priority order: take an item only if its line cost still fits.
    // Smaller, lower-priority items can still be picked after a larger one is skipped.
    // The 0.005 tolerance avoids float rounding excluding an item that exactly fits.
    const selectedItems = computed(() => {
      let remaining = budget.value
      const picked = []
      for (const rec of recommendations.value) {
        if (rec.line_cost <= remaining + 0.005) {
          picked.push(rec)
          remaining -= rec.line_cost
        }
      }
      return picked
    })

    const totalCost = computed(() =>
      selectedItems.value.reduce((sum, r) => sum + r.line_cost, 0)
    )
    const remainingBudget = computed(() => Math.max(0, budget.value - totalCost.value))
    const hasEstimated = computed(() => selectedItems.value.some(r => r.cost_estimated))

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString
      return date.toLocaleDateString(currentLocale.value === 'ja' ? 'ja-JP' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const loadRecommendations = async () => {
      try {
        loading.value = true
        error.value = null
        recommendations.value = await api.getRestockingRecommendations()
        // Start with a mid-range budget so the page shows a meaningful selection
        budget.value = Math.round(maxBudget.value / 2)
      } catch (err) {
        error.value = t('restocking.loadError') + ': ' + err.message
      } finally {
        loading.value = false
      }
    }

    const placeOrder = async () => {
      if (selectedItems.value.length === 0 || submitting.value) return
      submitting.value = true
      orderSuccess.value = null
      orderError.value = null
      try {
        const order = await api.createRestockingOrder({
          items: selectedItems.value.map(r => ({
            sku: r.sku,
            name: r.name,
            quantity: r.recommended_quantity,
            unit_cost: r.unit_cost
          }))
        })
        orderSuccess.value = t('restocking.orderSuccess', {
          orderNumber: order.order_number,
          date: formatDate(order.expected_delivery)
        })
        // Refresh recommendations (stock/pending orders may have changed)
        const keepBudget = budget.value
        await loadRecommendations()
        budget.value = Math.min(keepBudget, maxBudget.value)
      } catch (err) {
        orderError.value = t('restocking.orderError') + ': ' + err.message
      } finally {
        submitting.value = false
      }
    }

    onMounted(loadRecommendations)

    return {
      t,
      loading,
      error,
      recommendations,
      budget,
      maxBudget,
      budgetStep,
      selectedItems,
      totalCost,
      remainingBudget,
      hasEstimated,
      submitting,
      orderSuccess,
      orderError,
      money,
      placeOrder,
      translateProductName
    }
  }
}
</script>

<style scoped>
.budget-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.budget-slider {
  width: 100%;
  accent-color: #2563eb;
}

.slider-scale {
  display: flex;
  justify-content: space-between;
  font-size: 0.813rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.hint {
  font-size: 0.813rem;
  color: #64748b;
  margin-top: 0.75rem;
}

.num {
  text-align: right;
}

.estimated {
  font-size: 0.75rem;
  color: #92400e;
  margin-left: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #64748b;
  font-size: 0.938rem;
}

.success-message {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 1rem;
  border-radius: 8px;
  margin: 0 0 1.25rem;
  font-size: 0.938rem;
}

.place-order-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.place-order-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.place-order-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}
</style>
