'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TripStatistics } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { formatDurationShort } from '@/types'

interface StatisticsChartsProps {
  statistics: TripStatistics
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6']

export function StatisticsCharts({ statistics }: StatisticsChartsProps) {
  // 准备饼图数据
  const pieData = [
    { name: '步行', value: statistics.walkingTime, color: '#3b82f6' },
    { name: '地铁', value: statistics.metroTime, color: '#22c55e' },
    { name: '换乘', value: statistics.transferTime, color: '#f97316' }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{statistics.totalTrips}</p>
              <p className="text-sm text-gray-500">总行程数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatDurationShort(statistics.totalTime)}</p>
              <p className="text-sm text-gray-500">总时长</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatDurationShort(statistics.averageTime)}</p>
              <p className="text-sm text-gray-500">平均时长</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{formatDurationShort(statistics.metroTime)}</p>
              <p className="text-sm text-gray-500">平均地铁</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 时间分布饼图 */}
      <Card>
        <CardHeader>
          <CardTitle>时间分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value?: number) => formatDurationShort(value || 0)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">
                  {item.name}: {formatDurationShort(item.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 每日行程数趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>每日行程数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.tripsByDay.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value?: number) => [value || 0, '行程数']}
                  labelFormatter={(label?: string | number) => new Date(label as string).toLocaleDateString()}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 每日时长趋势 */}
      <Card>
        <CardHeader>
          <CardTitle>每日时长趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statistics.tripsByDay.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis
                  tickFormatter={(value?: number) => formatDurationShort(value || 0)}
                />
                <Tooltip
                  formatter={(value?: number) => [formatDurationShort(value || 0), '时长']}
                  labelFormatter={(label?: string | number) => new Date(label as string).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
