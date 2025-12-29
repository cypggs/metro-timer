'use client'

import { Checkpoint, CheckpointRecord, TimeSegment, formatDuration } from '@/types'
import { cn } from '@/lib/utils'
import { Footprints, Train, MapPin, CheckCircle2, ArrowRight } from 'lucide-react'

interface TripTimelineProps {
  checkpoints: (Checkpoint & { records: CheckpointRecord[] })[]
  segments: TimeSegment[]
}

const checkpointIcons = {
  walk_to_station: Footprints,
  enter_station: Train,
  exit_station: MapPin,
  destination: CheckCircle2
}

const checkpointLabels = {
  walk_to_station: '步行到站',
  enter_station: '进站',
  exit_station: '出站',
  destination: '到达'
}

export function TripTimeline({ checkpoints, segments }: TripTimelineProps) {
  const sorted = [...checkpoints].sort((a, b) => a.sequence_order - b.sequence_order)

  return (
    <div className="space-y-4">
      {/* 时间段汇总 */}
      {segments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">总时长</p>
            <p className="text-xl font-bold">{formatDuration(segments[0]?.durationSeconds || 0)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-500 mb-1">步行</p>
            <p className="text-xl font-bold text-blue-600">
              {formatDuration(segments.filter(s => s.type === 'walking').reduce((sum, s) => sum + s.durationSeconds, 0))}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-500 mb-1">地铁内</p>
            <p className="text-xl font-bold text-green-600">
              {formatDuration(segments.filter(s => s.type === 'metro').reduce((sum, s) => sum + s.durationSeconds, 0))}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-500 mb-1">换乘等待</p>
            <p className="text-xl font-bold text-orange-600">
              {formatDuration(segments.filter(s => s.type === 'transfer').reduce((sum, s) => sum + s.durationSeconds, 0))}
            </p>
          </div>
        </div>
      )}

      {/* 时间线 */}
      <div className="relative">
        {/* 垂直线 */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        {sorted.map((checkpoint, index) => {
          const Icon = checkpointIcons[checkpoint.checkpoint_type]
          const records = checkpoint.records || []
          const lastRecord = records.length > 0 ? records[records.length - 1] : null
          const hasRecords = records.length > 0

          return (
            <div key={checkpoint.id} className="relative flex items-start gap-4 mb-6 last:mb-0">
              {/* 图标 */}
              <div className={cn(
                'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 bg-white',
                hasRecords ? 'border-green-500' : 'border-gray-300'
              )}>
                <Icon className={cn(
                  'w-5 h-5',
                  hasRecords ? 'text-green-600' : 'text-gray-400'
                )} />
                {hasRecords && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{checkpoint.name}</h4>
                    <p className="text-sm text-gray-500">{checkpointLabels[checkpoint.checkpoint_type]}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                    #{checkpoint.sequence_order}
                  </span>
                </div>

                {/* 打卡记录 */}
                {hasRecords ? (
                  <div className="space-y-2">
                    {records.map((record) => (
                      <div key={record.id} className="flex items-center gap-2 text-sm">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          record.action_type === 'arrival'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        )}>
                          {record.action_type === 'arrival' ? '到达' : '离开'}
                        </span>
                        <span className="text-gray-600">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">等待打卡...</p>
                )}

                {/* 显示与下一站的时间差 */}
                {hasRecords && index < sorted.length - 1 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
                    <ArrowRight className="w-4 h-4" />
                    <span>到下一站:</span>
                    <span className="font-medium text-gray-700">
                      {(() => {
                        const nextCheckpoint = sorted[index + 1]
                        const nextRecords = nextCheckpoint.records || []
                        if (nextRecords.length === 0) return '等待打卡'

                        const currentEnd = records[records.length - 1].timestamp
                        const nextStart = nextRecords[0].timestamp
                        const diff = (new Date(nextStart).getTime() - new Date(currentEnd).getTime()) / 1000

                        if (diff <= 0) return '-'
                        return formatDuration(Math.floor(diff))
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
