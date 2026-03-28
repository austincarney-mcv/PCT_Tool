import { useQuery } from '@tanstack/react-query'
import { c2cApi } from '../../api/c2c.api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

/**
 * Dual-line trend chart (Under/Over + CTC) for a given project + phase.
 * @param {number|string} projectId
 * @param {'design'|'construction'} phase  — defaults to 'design'
 * @param {number} height                  — chart height in px, defaults to 200
 */
export default function C2CTrendChart({ projectId, phase = 'design', height = 200 }) {
  const { data = [] } = useQuery({
    queryKey: ['c2c-trend', projectId],
    queryFn: () => c2cApi.trend(projectId),
    enabled: !!projectId,
  })

  const chartData = data
    .filter(d => d.phase === phase)
    .map(d => ({
      name: `W${d.week_number}`,
      'Under/Over': d.total_under_over ? Math.round(d.total_under_over) : 0,
      'CTC': d.total_ctc ? Math.round(d.total_ctc) : 0,
    }))

  if (!chartData.length) return <div className="empty-state">No C2C snapshot data yet.</div>

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={v => `$${v.toLocaleString()}`} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Under/Over" stroke="#2A4735" strokeWidth={2} dot={{ r: 3 }} isAnimationActive />
          <Line type="monotone" dataKey="CTC" stroke="#CEDDC3" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
