import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Checkpoint, CheckpointRecord, TimeSegment } from '@/types'
import { formatDuration } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateTimeSegments(
  checkpoints: (Checkpoint & { records: CheckpointRecord[] })[]
): TimeSegment[] {
  const segments: TimeSegment[] = []

  if (checkpoints.length < 2) return segments

  // 排序打卡点
  const sorted = [...checkpoints].sort((a, b) => a.sequence_order - b.sequence_order)

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    // 获取当前和下一个打卡点的最后记录时间
    const currentRecords = current.records || []
    const nextRecords = next.records || []

    if (currentRecords.length === 0 || nextRecords.length === 0) continue

    // 获取每个打卡点的到达和离开时间
    const currentArrival = currentRecords.find(r => r.action_type === 'arrival')
    const currentDeparture = currentRecords.find(r => r.action_type === 'departure')
    const nextArrival = nextRecords.find(r => r.action_type === 'arrival')

    // 确定时间段
    let segmentType: TimeSegment['type'] = 'total'
    let segmentName = ''

    // 步行到地铁：从出发地到第一个地铁站
    if (current.checkpoint_type === 'walk_to_station' && next.checkpoint_type === 'enter_station') {
      segmentType = 'walking'
      segmentName = '步行到地铁'
    }
    // 地铁内：从进站到出站
    else if (current.checkpoint_type === 'enter_station' && next.checkpoint_type === 'exit_station') {
      segmentType = 'metro'
      segmentName = '地铁内'
    }
    // 换乘等待：从出站到下一站进站
    else if (current.checkpoint_type === 'exit_station' && next.checkpoint_type === 'enter_station') {
      segmentType = 'transfer'
      segmentName = '换乘等待'
    }
    // 出站步行：从最后一个地铁站到目的地
    else if (current.checkpoint_type === 'exit_station' && next.checkpoint_type === 'destination') {
      segmentType = 'walking'
      segmentName = '步行出站'
    }
    else if (current.checkpoint_type === 'walk_to_station' && next.checkpoint_type === 'destination') {
      segmentType = 'walking'
      segmentName = '直达步行'
    }
    else {
      segmentName = '未分类'
    }

    // 计算时间
    const startTime = currentDeparture?.timestamp || currentArrival?.timestamp || currentRecords[0]?.timestamp
    const endTime = nextArrival?.timestamp || nextRecords[0]?.timestamp

    if (startTime && endTime) {
      const start = new Date(startTime).getTime()
      const end = new Date(endTime).getTime()
      const duration = Math.floor((end - start) / 1000)

      if (duration > 0) {
        segments.push({
          name: segmentName,
          type: segmentType,
          durationSeconds: duration,
          startTime,
          endTime
        })
      }
    }
  }

  // 添加总时长
  if (segments.length > 0) {
    const totalDuration = segments.reduce((sum, s) => sum + s.durationSeconds, 0)
    const firstStart = segments[0].startTime
    const lastEnd = segments[segments.length - 1].endTime

    segments.unshift({
      name: '总时长',
      type: 'total',
      durationSeconds: totalDuration,
      startTime: firstStart,
      endTime: lastEnd
    })
  }

  return segments
}

export function getSegmentSummary(segments: TimeSegment[]) {
  const walking = segments.filter(s => s.type === 'walking').reduce((sum, s) => sum + s.durationSeconds, 0)
  const metro = segments.filter(s => s.type === 'metro').reduce((sum, s) => sum + s.durationSeconds, 0)
  const transfer = segments.filter(s => s.type === 'transfer').reduce((sum, s) => sum + s.durationSeconds, 0)
  const total = segments.length > 0 ? segments[0].durationSeconds : 0

  return {
    walking: formatDuration(walking),
    metro: formatDuration(metro),
    transfer: formatDuration(transfer),
    total: formatDuration(total),
    walkingSeconds: walking,
    metroSeconds: metro,
    transferSeconds: transfer,
    totalSeconds: total
  }
}

export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  })
}

export function generateDefaultTripName(): string {
  const now = new Date()
  const hour = now.getHours()
  let timeOfDay = ''

  if (hour >= 5 && hour < 12) {
    timeOfDay = '上午'
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = '下午'
  } else {
    timeOfDay = '晚上'
  }

  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`
  return `${dateStr}${timeOfDay}通勤`
}
