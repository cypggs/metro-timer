'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trip, Checkpoint, CheckpointRecord } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Calendar, Clock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDuration } from '@/types'

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTrips = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)

      setTrips(data || [])
    } catch (error) {
      console.error('获取行程历史失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('确定要删除这个行程记录吗？')) return

    try {
      await supabase.from('trips').delete().eq('id', tripId)
      setTrips(trips.filter(t => t.id !== tripId))
    } catch (error) {
      console.error('删除行程失败:', error)
      alert('删除失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">历史记录</h1>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-md mx-auto px-4 py-4">
        {trips.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">还没有行程记录</p>
                <Link href="/">
                  <Button>开始第一次行程</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{trip.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(trip.created_at).toLocaleDateString()}
                        {' '}
                        {new Date(trip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {trip.total_duration_seconds ? formatDuration(trip.total_duration_seconds) : '-'}
                      </p>
                    </div>
                  </div>
                  {trip.start_time && trip.end_time && (
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(trip.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
