'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckpointType, ActionType, CheckpointRecord } from '@/types'
import { cn, getCurrentLocation } from '@/lib/utils'
import { Clock, MapPin, Train, Footprints, CheckCircle2, Loader2 } from 'lucide-react'

interface CheckInButtonProps {
  checkpointType: CheckpointType
  checkpointName: string
  onCheckIn: (data: {
    checkpointType: CheckpointType
    actionType: ActionType
    location?: { lat: number; lng: number }
  }) => Promise<void>
  lastRecord?: CheckpointRecord
  disabled?: boolean
}

const checkpointConfig = {
  walk_to_station: {
    icon: Footprints,
    label: '步行到地铁',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200'
  },
  enter_station: {
    icon: Train,
    label: '进站',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200'
  },
  exit_station: {
    icon: MapPin,
    label: '出站',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-200'
  },
  destination: {
    icon: CheckCircle2,
    label: '到达目的地',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-200'
  }
}

export function CheckInButton({
  checkpointType,
  checkpointName,
  onCheckIn,
  lastRecord,
  disabled
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const config = checkpointConfig[checkpointType]
  const Icon = config.icon

  // 确定操作类型：如果是第一个打卡点或没有记录，则为到达(arrival)，否则为离开(departure)
  const actionType: ActionType = !lastRecord ? 'arrival' : 'departure'

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      let loc: { lat: number; lng: number } | undefined
      try {
        loc = await getCurrentLocation()
        setLocation(loc)
      } catch (e) {
        // 用户拒绝定位或定位失败，继续打卡
        console.warn('获取位置失败:', e)
      }

      await onCheckIn({
        checkpointType,
        actionType,
        location: loc
      })
    } catch (error) {
      console.error('打卡失败:', error)
      alert('打卡失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn('transition-all', config.bgColor, config.borderColor)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <Icon className={cn('w-6 h-6', config.color)} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{config.label}</p>
              <p className="font-semibold text-lg">{checkpointName}</p>
              {lastRecord && (
                <p className="text-xs text-gray-400">
                  上次: {new Date(lastRecord.timestamp).toLocaleTimeString()}
                </p>
              )}
              {location && (
                <p className="text-xs text-gray-400">
                  位置: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={handleCheckIn}
            disabled={disabled || loading}
            size="lg"
            className={cn(
              'min-w-[100px]',
              config.color.replace('text-', 'bg-').replace('-600', '-500')
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Clock className="w-5 h-5 mr-2" />
                {actionType === 'arrival' ? '到达' : '离开'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
