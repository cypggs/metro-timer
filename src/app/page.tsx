'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trip, Checkpoint, CheckpointRecord, CheckpointType, ActionType } from '@/types'
import { generateDefaultTripName, calculateTimeSegments, getSegmentSummary, getCurrentLocation } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckInButton } from '@/components/CheckInButton'
import { TripTimeline } from '@/components/TripTimeline'
import { AuthForm } from '@/components/AuthForm'
import { User } from 'lucide-react'
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  History,
  BarChart3,
  Home,
  MapPin,
  Train,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [checkpoints, setCheckpoints] = useState<(Checkpoint & { records: CheckpointRecord[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [newTripName, setNewTripName] = useState('')
  const [initialLocation, setInitialLocation] = useState<string>('家')

  // 获取当前行程
  const fetchCurrentTrip = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 查找进行中的行程
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)

      if (trips && trips.length > 0) {
        const trip = trips[0]
        setCurrentTrip(trip)

        // 获取打卡点
        const { data: checkpointsData } = await supabase
          .from('checkpoints')
          .select('*')
          .eq('trip_id', trip.id)
          .order('sequence_order')

        if (checkpointsData) {
          // 获取每个打卡点的记录
          const checkpointsWithRecords = await Promise.all(
            checkpointsData.map(async (cp) => {
              const { data: records } = await supabase
                .from('checkpoint_records')
                .select('*')
                .eq('checkpoint_id', cp.id)
                .order('timestamp')

              return {
                ...cp,
                records: records || []
              }
            })
          )

          setCheckpoints(checkpointsWithRecords)
        }
      } else {
        setCurrentTrip(null)
        setCheckpoints([])
      }
    } catch (error) {
      console.error('获取行程失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentTrip()

    // 订阅变化
    const channel = supabase
      .channel('trips-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, fetchCurrentTrip)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkpoint_records' }, fetchCurrentTrip)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCurrentTrip])

  // 创建新行程
  const handleCreateTrip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('请先登录')
        return
      }

      // 获取位置
      let location: { lat: number; lng: number } | undefined
      try {
        location = await getCurrentLocation()
      } catch (e) {
        console.warn('获取位置失败')
      }

      // 创建行程
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: newTripName || generateDefaultTripName(),
          start_time: new Date().toISOString(),
          status: 'in_progress'
        })
        .select()
        .single()

      if (tripError) throw tripError

      // 创建第一个打卡点（步行到地铁）
      const { data: cp1, error: cp1Error } = await supabase
        .from('checkpoints')
        .insert({
          trip_id: trip.id,
          name: initialLocation,
          checkpoint_type: 'walk_to_station',
          sequence_order: 1,
          latitude: location?.lat,
          longitude: location?.lng
        })
        .select()
        .single()

      if (cp1Error) throw cp1Error

      // 添加到达记录
      await supabase.from('checkpoint_records').insert({
        checkpoint_id: cp1.id,
        action_type: 'arrival',
        timestamp: new Date().toISOString()
      })

      setShowNewTripModal(false)
      setNewTripName('')
      fetchCurrentTrip()
    } catch (error) {
      console.error('创建行程失败:', error)
      alert('创建行程失败')
    }
  }

  // 完成行程
  const handleCompleteTrip = async () => {
    if (!currentTrip) return

    try {
      const endTime = new Date().toISOString()
      const segments = calculateTimeSegments(checkpoints)
      const summary = getSegmentSummary(segments)

      await supabase
        .from('trips')
        .update({
          status: 'completed',
          end_time: endTime,
          total_duration_seconds: summary.totalSeconds
        })
        .eq('id', currentTrip.id)

      setCurrentTrip(null)
      setCheckpoints([])
    } catch (error) {
      console.error('完成行程失败:', error)
      alert('完成行程失败')
    }
  }

  // 添加打卡点
  const handleAddCheckpoint = async (checkpointType: CheckpointType, name: string) => {
    if (!currentTrip) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('请先登录')
        return
      }

      // 获取位置
      let location: { lat: number; lng: number } | undefined
      try {
        location = await getCurrentLocation()
      } catch (e) {
        console.warn('获取位置失败')
      }

      const order = checkpoints.length + 1

      const { data: checkpoint, error } = await supabase
        .from('checkpoints')
        .insert({
          trip_id: currentTrip.id,
          name,
          checkpoint_type: checkpointType,
          sequence_order: order,
          latitude: location?.lat,
          longitude: location?.lng
        })
        .select()
        .single()

      if (error) throw error

      // 添加到达记录
      await supabase.from('checkpoint_records').insert({
        checkpoint_id: checkpoint.id,
        action_type: 'arrival',
        timestamp: new Date().toISOString()
      })

      fetchCurrentTrip()
    } catch (error) {
      console.error('添加打卡点失败:', error)
      alert('添加打卡点失败')
    }
  }

  // 打卡
  const handleCheckIn = async (data: {
    checkpointType: CheckpointType
    actionType: ActionType
    location?: { lat: number; lng: number }
  }) => {
    if (!currentTrip) return

    try {
      // 找到对应类型的最新打卡点，如果没有则创建
      let checkpoint: Checkpoint | null = checkpoints.find(cp => cp.checkpoint_type === data.checkpointType) || null

      if (!checkpoint) {
        // 需要用户输入地点名称
        const name = prompt(`请输入${data.checkpointType === 'enter_station' ? '进站' : data.checkpointType === 'exit_station' ? '出站' : '目的地'}名称:`)
        if (!name) return

        const order = checkpoints.length + 1
        const { data: newCp, error } = await supabase
          .from('checkpoints')
          .insert({
            trip_id: currentTrip.id,
            name,
            checkpoint_type: data.checkpointType,
            sequence_order: order,
            latitude: data.location?.lat,
            longitude: data.location?.lng
          })
          .select()
          .single()

        if (error) throw error
        if (!newCp) throw new Error('创建打卡点失败')
        checkpoint = newCp
      }

      // 确保 checkpoint 不为 null
      if (!checkpoint) return

      // 添加打卡记录
      await supabase.from('checkpoint_records').insert({
        checkpoint_id: checkpoint.id,
        action_type: data.actionType,
        timestamp: new Date().toISOString()
      })

      fetchCurrentTrip()
    } catch (error) {
      console.error('打卡失败:', error)
      throw error
    }
  }

  // 快速添加地铁站
  const handleQuickCheckIn = async (type: 'enter' | 'exit' | 'destination') => {
    if (!currentTrip) return

    const checkpointType: CheckpointType = type === 'enter' ? 'enter_station'
      : type === 'exit' ? 'exit_station' : 'destination'

    const stationName = prompt('请输入地铁站名称:')
    if (!stationName) return

    await handleAddCheckpoint(checkpointType, stationName)
  }

  const segments = calculateTimeSegments(checkpoints)

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
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">地铁计时器</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowAuthModal(true)}>
              <User className="w-5 h-5" />
            </Button>
            <Link href="/statistics">
              <Button variant="ghost" size="icon">
                <BarChart3 className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="icon">
                <History className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-md mx-auto px-4 py-4">
        {!currentTrip ? (
          /* 开始新行程 */
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Train className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-6">还没有进行中的行程</p>
                  <Button onClick={() => {
                    setNewTripName(generateDefaultTripName())
                    setShowNewTripModal(true)
                  }} size="lg" className="w-full">
                    <Play className="w-5 h-5 mr-2" />
                    开始新行程
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 快捷操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => handleQuickCheckIn('enter')}>
                  <Train className="w-4 h-4 mr-2" />
                  进站打卡
                </Button>
                <Button variant="outline" onClick={() => handleQuickCheckIn('exit')}>
                  <MapPin className="w-4 h-4 mr-2" />
                  出站打卡
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* 进行中的行程 */
          <div className="space-y-4">
            {/* 行程信息 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{currentTrip.name}</h2>
                    <p className="text-sm text-gray-500">
                      开始时间: {new Date(currentTrip.start_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleCompleteTrip}>
                    完成行程
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 时间汇总 */}
            {segments.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-100 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">总时长</p>
                  <p className="font-bold text-sm">{getSegmentSummary(segments).total}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-blue-500">步行</p>
                  <p className="font-bold text-sm text-blue-600">{getSegmentSummary(segments).walking}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500">地铁</p>
                  <p className="font-bold text-sm text-green-600">{getSegmentSummary(segments).metro}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-orange-500">换乘</p>
                  <p className="font-bold text-sm text-orange-600">{getSegmentSummary(segments).transfer}</p>
                </div>
              </div>
            )}

            {/* 打卡按钮 */}
            <div className="space-y-3">
              {checkpoints.map((checkpoint) => (
                <CheckInButton
                  key={checkpoint.id}
                  checkpointType={checkpoint.checkpoint_type}
                  checkpointName={checkpoint.name}
                  onCheckIn={handleCheckIn}
                  lastRecord={checkpoint.records[checkpoint.records.length - 1]}
                />
              ))}
            </div>

            {/* 快捷打卡 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">添加打卡点</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickCheckIn('enter')}>
                  <Train className="w-4 h-4 mr-1" />
                  进站
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickCheckIn('exit')}>
                  <MapPin className="w-4 h-4 mr-1" />
                  出站
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickCheckIn('destination')}>
                  <Home className="w-4 h-4 mr-1" />
                  目的地
                </Button>
              </CardContent>
            </Card>

            {/* 时间线 */}
            {checkpoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">行程详情</CardTitle>
                </CardHeader>
                <CardContent>
                  <TripTimeline checkpoints={checkpoints} segments={segments} />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* 新行程弹窗 */}
      {showNewTripModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle>开始新行程</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">起点名称</label>
                <input
                  type="text"
                  value={initialLocation}
                  onChange={(e) => setInitialLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例如: 家、公司"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">行程名称（可选）</label>
                <input
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="自动生成"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowNewTripModal(false)} className="flex-1">
                  取消
                </Button>
                <Button onClick={handleCreateTrip} className="flex-1">
                  开始
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 登录弹窗 */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center">登录 / 注册</CardTitle>
            </CardHeader>
            <CardContent>
              <AuthForm />
              <Button
                variant="ghost"
                className="mt-4 w-full"
                onClick={() => setShowAuthModal(false)}
              >
                关闭
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
