import { useEffect, useState } from 'react'
import api from '../lib/axios'
import { formatCurrency, formatDate } from '../lib/utils'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Label from '../components/ui/Label'
import Select from '../components/ui/Select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { FileSpreadsheet, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const Reports = () => {
  const [summary, setSummary] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: ''
  })

  useEffect(() => {
    fetchReportData()
  }, [filters])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.type) params.append('type', filters.type)

      const [summaryRes, categoryRes, monthlyRes, transactionsRes] = await Promise.all([
        api.get(`/reports/summary?${params}`),
        api.get(`/reports/by-category?${params}`),
        api.get(`/reports/monthly?${params}`),
        api.get(`/transactions?${params}`)
      ])

      setSummary(summaryRes.data.data)
      setCategoryData(categoryRes.data.data)
      setMonthlyData(monthlyRes.data.data)
      setTransactions(transactionsRes.data.data)
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCsv = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency']
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type,
      t.category?.name || '',
      t.description || '',
      t.displayAmount ?? t.amount,
      t.displayCurrency || summary?.displayCurrency || 'INR'
    ])
    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expense-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFontSize(20)
    doc.text('Expense Report', 14, 22)
    
    doc.setFontSize(12)
    doc.text(`Period: ${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`, 14, 32)
    
    doc.text(`Total Income: ${formatCurrency(summary?.displayIncome ?? summary?.income ?? 0, summary?.displayCurrency)}`, 14, 42)
    doc.text(`Total Expenses: ${formatCurrency(summary?.displayExpense ?? summary?.expense ?? 0, summary?.displayCurrency)}`, 14, 50)
    doc.text(`Net Balance: ${formatCurrency(summary?.displayBalance ?? summary?.balance ?? 0, summary?.displayCurrency)}`, 14, 58)

    const tableData = transactions.map(t => [
      formatDate(t.date),
      t.type,
      t.category?.name,
      t.description || '-',
      formatCurrency(t.displayAmount ?? t.amount, t.displayCurrency)
    ])

    doc.autoTable({
      head: ['Date', 'Type', 'Category', 'Description', 'Amount'],
      body: tableData,
      startY: 70,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })

    doc.save(`expense-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={filters.type} 
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchReportData} className="flex-1">Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(summary?.displayIncome ?? summary?.income ?? 0, summary?.displayCurrency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(summary?.displayExpense ?? summary?.expense ?? 0, summary?.displayCurrency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${summary?.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.displayBalance ?? summary?.balance ?? 0, summary?.displayCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={(value) => monthNames[value - 1]} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(value) => monthNames[value - 1]} />
                <Line type="monotone" dataKey="displayIncome" stroke="#10B981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="displayExpense" stroke="#EF4444" strokeWidth={2} name="Expense" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoryName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="displayTotal" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: transaction.category?.color }}
                    >
                      {transaction.category?.name?.[0] || 'T'}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description || transaction.category?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.category?.name} • {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.displayAmount ?? transaction.amount, transaction.displayCurrency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected period
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button onClick={exportToCsv} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default Reports
