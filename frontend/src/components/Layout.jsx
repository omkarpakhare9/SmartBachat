import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  FolderTree, 
  Users, 
  LogOut,
  Moon,
  Sun,
  Target
} from 'lucide-react'
import Button from './ui/Button'

const Layout = () => {
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
    { path: '/splits', icon: Users, label: 'Splits' },
    { path: '/budgets', icon: Target, label: 'Budgets' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">ExpenseTracker</h1>
        </div>
        <nav className="px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user.name}
              </span>
            </div>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
