import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '@/lib/report-metrics'
import type { TrendRow } from './index'

const tick = { fontSize: 12, fill: 'var(--muted-foreground)' }
const tooltip = {
  contentStyle: {
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--popover)',
    color: 'var(--popover-foreground)',
    fontSize: 12,
    padding: '6px 8px',
  },
  labelStyle: { color: 'var(--muted-foreground)' },
  itemStyle: { color: 'var(--foreground)' },
}

const PROSES = [
  { proses: 'broker', label: 'Broker' },
  { proses: 'crusher', label: 'Crusher' },
  { proses: 'gilingan', label: 'Gilingan' },
  { proses: 'mixer', label: 'Mixer' },
  { proses: 'washing', label: 'Washing' },
] as const

export function PpsTrendChart({ data }: { data: TrendRow[] }) {
  return (
    <ResponsiveContainer width='100%' height='100%'>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke='var(--border)' />
        <XAxis dataKey='label' axisLine={false} tickLine={false} tick={tick} />
        <YAxis axisLine={false} tickLine={false} tick={tick} width={52} />
        <Tooltip
          {...tooltip}
          formatter={(value, name) => [
            `${formatNumber(Number(value))} kg`,
            name,
          ]}
        />
        <Legend
          verticalAlign='top'
          align='left'
          iconType='circle'
          iconSize={6}
          wrapperStyle={{ fontSize: 12, paddingBottom: 12 }}
          formatter={(value) => (
            <span style={{ color: 'var(--muted-foreground)' }}>{value}</span>
          )}
        />
        {PROSES.map(({ proses, label }, i) => (
          <Line
            key={proses}
            type='linear'
            dataKey={proses}
            name={label}
            stroke={`var(--chart-${i + 1})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
