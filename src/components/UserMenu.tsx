'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { AuthForm } from '@/components/AuthForm'
import { User, LogOut, Loader2 } from 'lucide-react'

export function UserMenu() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    // 获取当前用户
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <Loader2 className="w-5 h-5 animate-spin" />
  }

  if (!user) {
    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => setShowAuth(true)}>
          <User className="w-4 h-4 mr-1" />
          登录
        </Button>

        {showAuth && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm">
              <AuthForm />
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => setShowAuth(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 hidden sm:inline">
        {user.email}
      </span>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}
