export type CheckpointType = 'walk_to_station' | 'enter_station' | 'exit_station' | 'destination'
export type ActionType = 'arrival' | 'departure'
export type TripStatus = 'in_progress' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  email: string
  nickname: string | null
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  user_id: string
  name: string
  start_time: string
  end_time: string | null
  status: TripStatus
  total_duration_seconds: number | null
  created_at: string
  updated_at: string
  checkpoints?: Checkpoint[]
}

export interface Checkpoint {
  id: string
  trip_id: string
  name: string
  checkpoint_type: CheckpointType
  sequence_order: number
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
  records?: CheckpointRecord[]
}

export interface CheckpointRecord {
  id: string
  checkpoint_id: string
  action_type: ActionType
  timestamp: string
  created_at: string
}

export interface TripWithDetails extends Trip {
  checkpoints: (Checkpoint & { records: CheckpointRecord[] })[]
}

export interface TimeSegment {
  name: string
  type: 'walking' | 'metro' | 'transfer' | 'total'
  durationSeconds: number
  startTime: string
  endTime: string
}

export interface TripStatistics {
  totalTrips: number
  totalTime: number
  averageTime: number
  walkingTime: number
  metroTime: number
  transferTime: number
  tripsByDay: { date: string; count: number; duration: number }[]
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
