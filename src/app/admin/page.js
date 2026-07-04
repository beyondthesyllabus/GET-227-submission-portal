'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import AdminLogin from '../../components/AdminLogin'
import AdminDashboard from '../../components/AdminDashboard'

export default function AdminPage() {
  const [token, setToken] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_token')
    if (stored) setToken(stored)
    setChecked(true)
  }, [])

  if (!checked) return null

  return (
    <div>
      {token ? (
        <AdminDashboard token={token} onLogout={() => setToken(null)} />
      ) : (
        <AdminLogin onLogin={(t) => setToken(t)} />
      )}
    </div>
  )
}
