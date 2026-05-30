import { useState, useEffect } from 'react'
import api from '../lib/axios'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Label from '../components/ui/Label'
import Select from '../components/ui/Select'
import { formatCurrency } from '../lib/utils'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'

const Budgets = () => {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    period: 'monthly',
    alert_threshold: 80,
    alert_enabled: true
  })

  // Fetch budgets and categories
  useEffect(() => {
    fetchBudgets()
    fetchCategories()
  }, [selectedPeriod])

  const fetchBudgets = async () => {
    try {
      const res = await api.get(`/budgets?period=${selectedPeriod}`)
      setBudgets(res.data.budgets)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to fetch budgets')
      setMessageType('error')
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories')
      // Filter to only expense categories
      setCategories(res.data.categories.filter(c => c.type === 'expense'))
    } catch (error) {
      console.error('Failed to fetch categories')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (editingId) {
        await api.put(`/budgets/${editingId}`, formData)
        setMessage('Budget updated successfully')
      } else {
        await api.post('/budgets', formData)
        setMessage('Budget created successfully')
      }
      setMessageType('success')
      setFormData({ category_id: '', amount: '', period: 'monthly', alert_threshold: 80, alert_enabled: true })
      setShowForm(false)
      setEditingId(null)
      fetchBudgets()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save budget')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (budget) => {
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount,
      period: budget.period,
      alert_threshold: budget.alert_threshold,
      alert_enabled: budget.alert_enabled
    })
    setEditingId(budget.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.delete(`/budgets/${id}`)
        setMessage('Budget deleted successfully')
        setMessageType('success')
        fetchBudgets()
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to delete budget')
        setMessageType('error')
      }
    }
  }

  const getBudgetProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget Management</h2>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ category_id: '', amount: '', period: 'monthly', alert_threshold: 80, alert_enabled: true }); }}>
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* New Budget Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Budget' : 'Create New Budget'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Budget Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    disabled={!!editingId}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold">Alert Threshold (%)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alert_threshold}
                    onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.alert_enabled}
                    onChange={(e) => setFormData({ ...formData, alert_enabled: e.target.checked })}
                  />
                  <span>Enable alerts for this budget</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update Budget' : 'Create Budget'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({ category_id: '', amount: '', period: 'monthly', alert_threshold: 80, alert_enabled: true })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Period Filter */}
      <div className="flex gap-2">
        {['weekly', 'monthly', 'yearly'].map(period => (
          <Button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            variant={selectedPeriod === period ? 'default' : 'outline'}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Button>
        ))}
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map(budget => (
          <Card key={budget.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: budget.color }}
                    />
                    <div>
                      <p className="font-semibold">{budget.category_name}</p>
                      <p className="text-sm text-muted-foreground">{budget.period}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(budget)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Budget Amount */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: {formatCurrency(budget.displaySpent ?? budget.spent, budget.displayCurrency)}</span>
                    <span className="font-semibold">{formatCurrency(budget.displayAmount ?? budget.amount, budget.displayCurrency)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Remaining: {formatCurrency(budget.displayRemaining ?? budget.remaining, budget.displayCurrency)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{budget.percentage.toFixed(1)}%</span>
                    <span>{budget.alert_threshold}% threshold</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-full rounded-full ${getBudgetProgressColor(budget.percentage)}`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                {budget.isAlert && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded text-yellow-800 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Approaching limit
                  </div>
                )}

                {budget.isExceeded && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-red-800 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Budget exceeded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {budgets.length === 0 && !showForm && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No budgets yet. Create one to get started!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Budgets
