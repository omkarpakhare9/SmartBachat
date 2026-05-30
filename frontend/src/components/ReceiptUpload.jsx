import { useState, useRef } from 'react'
import api from '../lib/axios'
import Button from './ui/Button'
import Input from './ui/Input'
import Label from './ui/Label'
import { Upload, File, Trash2, Download } from 'lucide-react'

const ReceiptUpload = ({ transactionId, onUploadSuccess }) => {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const fileInputRef = useRef(null)

  // Fetch receipts for transaction
  const fetchReceipts = async () => {
    try {
      const res = await api.get(`/receipts/transaction/${transactionId}`)
      setReceipts(res.data.receipts)
    } catch (error) {
      console.error('Failed to fetch receipts:', error)
    }
  }

  // Load receipts on mount
  useState(() => {
    if (transactionId) {
      fetchReceipts()
    }
  }, [transactionId])

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post(
        `/receipts/transaction/${transactionId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      setMessage('Receipt uploaded successfully')
      setMessageType('success')
      setReceipts([res.data.receipt, ...receipts])
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      if (onUploadSuccess) {
        onUploadSuccess(res.data.receipt)
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to upload receipt')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (receiptId) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      try {
        await api.delete(`/receipts/${receiptId}`)
        setReceipts(receipts.filter(r => r.id !== receiptId))
        setMessage('Receipt deleted successfully')
        setMessageType('success')
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to delete receipt')
        setMessageType('error')
      }
    }
  }

  const handleDownload = async (receiptId) => {
    try {
      // The backend will handle redirect or download
      window.open(`/api/receipts/${receiptId}/download`, '_blank')
    } catch (error) {
      console.error('Failed to download receipt:', error)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-md text-sm ${messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed border-border rounded-lg p-6 hover:bg-accent/5 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={loading}
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
          className="hidden"
          id="receipt-input"
        />

        <label htmlFor="receipt-input" className="cursor-pointer block text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="font-medium mb-1">
            {loading ? 'Uploading...' : 'Click to upload receipt'}
          </p>
          <p className="text-sm text-muted-foreground">
            or drag and drop (max 5MB)
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: JPG, PNG, PDF, DOC
          </p>
        </label>
      </div>

      {/* Receipts List */}
      {receipts.length > 0 && (
        <div className="space-y-2">
          <Label>Attached Receipts ({receipts.length})</Label>
          <div className="space-y-2">
            {receipts.map(receipt => (
              <div key={receipt.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-sm text-sm truncate">{receipt.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(receipt.file_size)} • {new Date(receipt.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(receipt.id)}
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(receipt.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReceiptUpload
