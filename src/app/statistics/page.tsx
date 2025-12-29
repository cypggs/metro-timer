'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TripStatistics, Trip, Checkpoint, CheckpointRecord } from '@/types'
import { StatisticsCharts } from '@/components/StatisticsCharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatDurationShort } from '@/types'

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<TripStatistics>({
    totalTrips: 0,
    totalTime: 0,
    averageTime: 0,
    walkingTime: 0,
    metroTime: 0,
    transferTime: 0,
    tripsByDay: []
  })
  const [loading, setLoading] = useState(true)

  const fetchStatistics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 获取所有完成的行程
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      if (!trips || trips.length === 0) {
        setStatistics({
          totalTrips: 0,
          totalTime: 0,
          averageTime: 0,
          walkingTime: 0,
          metroTime: 0,
          transferTime: 0,
          tripsByDay: []
        })
        setLoading(false)
        return
      }

      // 计算统计数据
      let totalTime = 0
      let walkingTime = 0
      let metroTime = 0
      let transferTime = 0
      const tripsByDayMap = new Map<string, { count: number; duration: number }>()

      for (const trip of trips) {
        if (trip.total_duration_seconds) {
          totalTime += trip.total_duration_seconds
        }

        // 获取该行程的打卡点来计算各段时间
        const { data: checkpointsData } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('trip_id', trip.id)
          .order('sequence_order')

        if (checkpointsData) {
          const checkpointsWithRecords = await Promise.all(
            checkpointsData.map(async (cp) => {
              const { data: records } = await supabase
                .from('checkpoint_records')
                .select('*')
                .eq('checkpoint_id', cp.id)
                .order('timestamp')
              return { ...cp, records: records || [] }
            })
          )

          // 计算各段时间
          for (let i = 0; i < checkpointsWithRecords.length - 1; i++) {
            const current = checkpointsWithRecords[i]
            const next = checkpointsWithRecords[i + 1]

            const currentRecords = current.records
            const nextRecords = next.records

            if (currentRecords.length === 0 || nextRecords.length === 0) continue

            const currentEnd = currentRecords[currentRecords.length - 1].timestamp
            const nextStart = nextRecords[0].timestamp
            const duration = (new Date(nextStart).getTime() - new Date(currentEnd).getTime()) / 1000

            if (duration <= 0) continue

            if (current.checkpoint_type === 'walk_to_station' && next.checkpoint_type === 'enter_station') {
              walkingTime += duration
            } else if (current.checkpoint_type === 'enter_station' && next.checkpoint_type === 'exit_station') {
              metroTime += duration
            } else if (current.checkpoint_type === 'exit_station' && next.checkpoint_type === 'enter_station') {
              transferTime += duration
            } else if (current.checkpoint_type === 'exit_station' && next.checkpoint_type === 'destination') {
              walkingTime += duration
            }
          }
        }

        // 按日期汇总
        const date = new Date(trip.created_at).toISOString().split('T')[0]
        const existing = tripsByDayMap.get(date) || { count: 0, duration: 0 }
        existing.count += 1
        existing.duration += trip.total_duration_seconds || 0
        tripsByDayMap.set(date, existing)
      }

      const tripsByDay = Array.from(tripsByDayMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setStatistics({
        totalTrips: trips.length,
        totalTime,
        averageTime: Math.round(totalTime / trips.length),
        walkingTime,
        metroTime,
        transferTime,
        tripsByDay
      })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

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
          <h1 className="text-xl font-bold text-gray-900">统计数据</h1>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-md mx-auto px-4 py-4">
        {statistics.totalTrips === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">还没有完成的行程记录</p>
                <Link href="/">
                  <Button>开始第一次行程</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <StatisticsCharts statistics={statistics} />
        )}
      </main>
    </div>
  )
}
