'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        })
        if (error) throw error
        setMessage('注册成功！请检查邮箱验证链接。')
      }
    } catch (error: any) {
      setMessage(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isLogin ? '登录' : '注册'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="******"
              required
              minLength={6}
            />
          </div>

          {message && (
            <p className="text-sm text-center text-gray-600">{message}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isLogin ? '登录' : '注册'}
          </Button>

          <p className="text-sm text-center text-gray-500">
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage('')
              }}
              className="ml-1 text-blue-600 hover:underline"
            >
              {isLogin ? '立即注册' : '立即登录'}
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
