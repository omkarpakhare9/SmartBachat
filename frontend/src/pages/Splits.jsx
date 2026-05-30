import { useEffect, useState } from 'react'
import api from '../lib/axios'
import { formatCurrency, formatDate } from '../lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Label from '../components/ui/Label'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import { Plus, Users, CheckCircle, Clock } from 'lucide-react'

const Splits = () => {
  const [splits, setSplits] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    transaction: '',
    splitType: 'equal',
    participants: [{ user: '', share: 0 }],
    notes: ''
  })

  useEffect(() => {
    fetchSplits()
    fetchTransactions()
  }, [])

  const fetchSplits = async () => {
    try {
      const res = await api.get('/splits')
      setSplits(res.data.data)
    } catch (error) {
      console.error('Error fetching splits:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions?type=expense')
      setTransactions(res.data.data.filter(t => !t.isSplit))
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const addParticipant = () => {
    setFormData({
      ...formData,
      participants: [...formData.participants, { user: '', share: 0 }]
    })
  }

  const removeParticipant = (index) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((_, i) => i !== index)
    })
  }

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...formData.participants]
    updatedParticipants[index][field] = value
    setFormData({ ...formData, participants: updatedParticipants })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/splits', formData)
      setShowForm(false)
      setFormData({
        transaction: '',
        splitType: 'equal',
        participants: [{ user: '', share: 0 }],
        notes: ''
      })
      fetchSplits()
      fetchTransactions()
    } catch (error) {
      console.error('Error creating split:', error)
    }
  }

  const markAsPaid = async (splitId, participantId) => {
    try {
      await api.put(`/splits/${splitId}/participants/${participantId}`)
      fetchSplits()
    } catch (error) {
      console.error('Error marking as paid:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Splits</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Split
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Split</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Transaction</Label>
                <Select 
                  value={formData.transaction} 
                  onChange={(e) => setFormData({ ...formData, transaction: e.target.value })}
                  required
                >
                  <option value="">Select an expense</option>
                  {transactions.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.description || t.category?.name} - {formatCurrency(t.displayAmount ?? t.amount, t.displayCurrency)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Split Type</Label>
                <Select 
                  value={formData.splitType} 
                  onChange={(e) => setFormData({ ...formData, splitType: e.target.value })}
                >
                  <option value="equal">Equal Split</option>
                  <option value="percentage">By Percentage</option>
                  <option value="custom">Custom Amount</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Participants</Label>
                {formData.participants.map((participant, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder="User email"
                      value={participant.user}
                      onChange={(e) => handleParticipantChange(index, 'user', e.target.value)}
                      required
                    />
                    {formData.splitType !== 'equal' && (
                      <Input
                        type="number"
                        placeholder={formData.splitType === 'percentage' ? '%' : 'Amount'}
                        value={participant.share}
                        onChange={(e) => handleParticipantChange(index, 'share', parseFloat(e.target.value))}
                        required
                      />
                    )}
                    {formData.participants.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeParticipant(index)}>
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addParticipant}>
                  Add Participant
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this split"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Split</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {splits.length > 0 ? (
          splits.map((split) => (
            <Card key={split._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{split.transaction?.description || 'Untitled Split'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatDate(split.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {split.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Completed
                      </span>
                    )}
                    {split.status === 'partial' && (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <Clock className="w-4 h-4" />
                        Partial
                      </span>
                    )}
                    {split.status === 'pending' && (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-xl font-bold">{formatCurrency(split.displayTotalAmount ?? split.totalAmount, split.displayCurrency)}</span>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Split Type: {split.splitType}</p>
                    <div className="space-y-2">
                      {split.participants.map((participant, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{participant.user?.name || participant.user?.email || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">Share: {formatCurrency(participant.displayShare ?? participant.share, participant.displayCurrency || split.displayCurrency)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {participant.paid ? (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Paid
                              </span>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => markAsPaid(split._id, participant._id)}
                              >
                                Mark as Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {split.notes && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{split.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No expense splits created yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create a split to share expenses with others</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Splits
