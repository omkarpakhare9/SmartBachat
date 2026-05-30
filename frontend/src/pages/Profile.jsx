import { useEffect, useState } from 'react'
import api from '../lib/axios'
import { useAuth } from '../context/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Label from '../components/ui/Label'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { User, Lock, Mail, Calendar, CircleDollarSign } from 'lucide-react'

const Profile = () => {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currencies, setCurrencies] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    preferredCurrency: user?.preferredCurrency || 'INR'
  })

  useEffect(() => {
    api.get('/currencies')
      .then((res) => setCurrencies(res.data.data || []))
      .catch(() => setCurrencies([]))
  }, [])

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await api.put('/profile', { 
        name: profileForm.name,
        email: profileForm.email,
        preferredCurrency: profileForm.preferredCurrency
      })
      setUser(res.data.user)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      setMessage('Profile updated successfully')
      setMessageType('success')
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match')
      setMessageType('error')
      setLoading(false)
      return
    }

    try {
      await api.put('/profile/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      setMessage('Password updated successfully')
      setMessageType('success')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update password')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Profile Settings</h2>

      {message && (
        <div className={`p-4 rounded-md ${messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Member since:</span>
              <span className="font-medium">{new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CircleDollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-medium">{user?.preferredCurrency || 'INR'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredCurrency">Display Currency</Label>
              <Select
                id="preferredCurrency"
                value={profileForm.preferredCurrency}
                onChange={(e) => setProfileForm({ ...profileForm, preferredCurrency: e.target.value })}
              >
                {(currencies.length ? currencies : [{ code: 'INR', name: 'Indian Rupee' }]).map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Profile
