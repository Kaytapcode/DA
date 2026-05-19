import React from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { UserShell, useUserLanguage } from './UserShell'
import { apiClient } from '@/utils/apiClient'

type AnalyticsPeriod = 'day' | 'month' | 'year'

interface LearningAnalyticsBucket {
  bucketKey: string
  bucketStart: string
  quizAttempts: number
  videoViews: number
  documentViews: number
  flashcardDeckViews: number
  avgQuizScore: number
  bestQuizScore: number | null
  lowestQuizScore: number | null
}

interface LearningAnalyticsSummary {
  totalQuizAttempts: number
  totalVideoViews: number
  totalDocumentViews: number
  totalFlashcardDeckViews: number
  avgQuizScore: number
  bestQuizScore: number | null
  lowestQuizScore: number | null
}

interface LearningAnalyticsDto {
  period: AnalyticsPeriod
  rangeStart: string
  rangeEnd: string
  summary: LearningAnalyticsSummary
  buckets: LearningAnalyticsBucket[]
}

const periodOptions: Array<{ key: AnalyticsPeriod; labelEn: string; labelVi: string }> = [
  { key: 'day', labelEn: 'By day', labelVi: 'Theo ngay' },
  { key: 'month', labelEn: 'By month', labelVi: 'Theo thang' },
  { key: 'year', labelEn: 'By year', labelVi: 'Theo nam' },
]

const activitySeries = [
  { key: 'quizAttempts', color: '#4f46e5', labelEn: 'Quiz attempts', labelVi: 'Luot lam quiz' },
  { key: 'videoViews', color: '#16a34a', labelEn: 'Video views', labelVi: 'Luot xem video' },
  { key: 'documentViews', color: '#0284c7', labelEn: 'Document views', labelVi: 'Luot xem tai lieu' },
  { key: 'flashcardDeckViews', color: '#f59e0b', labelEn: 'Deck views', labelVi: 'Luot xem bo the' },
] as const

const scoreColor = '#e11d48'

const formatBucketLabel = (bucketStart: string, period: AnalyticsPeriod) => {
  const date = new Date(bucketStart)
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')

  if (period === 'day') return `${day}/${month}`
  if (period === 'month') return `${month}/${year}`
  return `${year}`
}

const ActivityBarChart: React.FC<{ buckets: LearningAnalyticsBucket[]; period: AnalyticsPeriod; isVi: boolean }> = ({ buckets, period, isVi }) => {
  const width = Math.max(720, buckets.length * 72)
  const height = 280
  const top = 20
  const bottom = 44
  const left = 20
  const right = 16
  const plotHeight = height - top - bottom
  const plotWidth = width - left - right
  const groupWidth = plotWidth / Math.max(1, buckets.length)
  const barGap = 4
  const barWidth = Math.max(7, (groupWidth - 16 - barGap * (activitySeries.length - 1)) / activitySeries.length)
  const maxValue = Math.max(
    1,
    ...buckets.flatMap((bucket) => [
      bucket.quizAttempts,
      bucket.videoViews,
      bucket.documentViews,
      bucket.flashcardDeckViews,
    ])
  )
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8))

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        sx={{ height: 280, minWidth: 720, width: '100%', display: 'block' }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + (1 - ratio) * plotHeight
          return (
            <line
              key={ratio}
              x1={left}
              y1={y}
              x2={width - right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          )
        })}

        {buckets.map((bucket, bucketIndex) => {
          const groupLeft = left + bucketIndex * groupWidth + 8
          const label = formatBucketLabel(bucket.bucketStart, period)
          return (
            <g key={bucket.bucketKey}>
              {activitySeries.map((series, seriesIndex) => {
                const value = bucket[series.key]
                const scaled = (value / maxValue) * plotHeight
                const x = groupLeft + seriesIndex * (barWidth + barGap)
                const y = top + plotHeight - scaled
                return (
                  <rect
                    key={series.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={scaled}
                    rx={4}
                    fill={series.color}
                    opacity={0.92}
                  />
                )
              })}
              {bucketIndex % labelStep === 0 && (
                <text
                  x={groupLeft + (activitySeries.length * barWidth + (activitySeries.length - 1) * barGap) / 2}
                  y={height - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={2} mt={2}>
        {activitySeries.map((series) => (
          <Stack key={series.key} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: series.color }} />
            <Typography variant="caption" color="text.secondary">
              {isVi ? series.labelVi : series.labelEn}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

const ScoreTrendChart: React.FC<{ buckets: LearningAnalyticsBucket[]; period: AnalyticsPeriod; isVi: boolean }> = ({ buckets, period, isVi }) => {
  const hasScoreData = buckets.some((bucket) => bucket.quizAttempts > 0)
  if (!hasScoreData) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          borderRadius: 2,
          px: 3,
          py: 2.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {isVi ? 'Chua co du lieu diem quiz trong khoang thoi gian nay.' : 'No quiz score data in this range yet.'}
        </Typography>
      </Box>
    )
  }

  const width = Math.max(680, buckets.length * 70)
  const height = 280
  const top = 20
  const bottom = 44
  const left = 24
  const right = 16
  const plotHeight = height - top - bottom
  const plotWidth = width - left - right
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8))

  const points = buckets.map((bucket, index) => {
    const x = left + (index / Math.max(1, buckets.length - 1)) * plotWidth
    const y = top + ((100 - bucket.avgQuizScore) / 100) * plotHeight
    return { x, y, bucket }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        sx={{ height: 280, minWidth: 680, width: '100%', display: 'block' }}
      >
        {[0, 25, 50, 75, 100].map((score) => {
          const y = top + ((100 - score) / 100) * plotHeight
          return (
            <g key={score}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={4} y={y + 4} fontSize="10" fill="#6b7280">{score}</text>
            </g>
          )
        })}

        <path d={linePath} fill="none" stroke={scoreColor} strokeWidth={3} />
        {points.map((point, index) => (
          <g key={point.bucket.bucketKey}>
            <circle cx={point.x} cy={point.y} r={4} fill="#fff" stroke={scoreColor} strokeWidth={2} />
            {index % labelStep === 0 && (
              <text x={point.x} y={height - 14} textAnchor="middle" fontSize="11" fill="#6b7280">
                {formatBucketLabel(point.bucket.bucketStart, period)}
              </text>
            )}
          </g>
        ))}
      </Box>
    </Box>
  )
}

const DistributionDonut: React.FC<{ summary: LearningAnalyticsSummary; isVi: boolean }> = ({ summary, isVi }) => {
  const segments = [
    { key: 'quiz', value: summary.totalQuizAttempts, color: '#4f46e5', labelEn: 'Quiz attempts', labelVi: 'Luot lam quiz' },
    { key: 'video', value: summary.totalVideoViews, color: '#16a34a', labelEn: 'Video views', labelVi: 'Luot xem video' },
    { key: 'document', value: summary.totalDocumentViews, color: '#0284c7', labelEn: 'Document views', labelVi: 'Luot xem tai lieu' },
    { key: 'deck', value: summary.totalFlashcardDeckViews, color: '#f59e0b', labelEn: 'Deck views', labelVi: 'Luot xem bo the' },
  ]

  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (total === 0) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          borderRadius: 2,
          px: 3,
          py: 2.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {isVi ? 'Chua co du lieu hoat dong de ve bieu do.' : 'No activity data to render distribution yet.'}
        </Typography>
      </Box>
    )
  }

  let running = 0
  const gradient = segments
    .map((segment) => {
      const start = running
      running += (segment.value / total) * 100
      return `${segment.color} ${start}% ${running}%`
    })
    .join(', ')

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
      <Box
        sx={{
          width: 176,
          height: 176,
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          mask: 'radial-gradient(circle, transparent 53%, black 54%)',
          WebkitMask: 'radial-gradient(circle, transparent 53%, black 54%)',
        }}
      />
      <Stack spacing={1} sx={{ width: '100%' }}>
        {segments.map((segment) => (
          <Stack key={segment.key} direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: segment.color }} />
              <Typography variant="body2" color="text.secondary">
                {isVi ? segment.labelVi : segment.labelEn}
              </Typography>
            </Stack>
            <Typography variant="subtitle2" color="text.primary">
              {segment.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}

export const UserAnalyticsDashboardPage: React.FC = () => {
  const isVi = useUserLanguage()
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('month')
  const [data, setData] = React.useState<LearningAnalyticsDto | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchAnalytics = React.useCallback(async (targetPeriod: AnalyticsPeriod) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<LearningAnalyticsDto>(`/student-progress/analytics?period=${targetPeriod}`)
      if (!res.success || !res.data) throw new Error(res.message || 'Unable to load analytics')
      setData(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchAnalytics(period)
  }, [fetchAnalytics, period])

  const summary = data?.summary ?? {
    totalQuizAttempts: 0,
    totalVideoViews: 0,
    totalDocumentViews: 0,
    totalFlashcardDeckViews: 0,
    avgQuizScore: 0,
    bestQuizScore: null,
    lowestQuizScore: null,
  }

  return (
    <UserShell
      titleEn="Learning Analytics Dashboard"
      titleVi="Bang thong ke hoc tap"
      subtitleEn="Visualize quiz, content views, and score trends"
      subtitleVi="Bieu do hoa quiz, luot xem noi dung va xu huong diem so"
    >
      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Tabs
                value={period}
                onChange={(_, value) => setPeriod(value)}
                textColor="primary"
                indicatorColor="primary"
                sx={{ minHeight: 40 }}
              >
                {periodOptions.map((option) => (
                  <Tab
                    key={option.key}
                    value={option.key}
                    label={isVi ? option.labelVi : option.labelEn}
                    sx={{ minHeight: 40, fontWeight: 600 }}
                  />
                ))}
              </Tabs>

              <Button variant="contained" size="small" onClick={() => void fetchAnalytics(period)} disabled={isLoading}>
                <MaterialIcon icon="refresh" size="xs" className="mr-1.5" />
                {isVi ? 'Tai lai' : 'Refresh'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error && !isLoading && <Alert severity="error">{error}</Alert>}

        {isLoading ? (
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            </CardContent>
          </Card>
        ) : (
          <>
            <Grid container spacing={2}>
              {[
                { label: isVi ? 'Quiz da lam' : 'Quiz attempts', value: summary.totalQuizAttempts },
                { label: isVi ? 'Diem trung binh' : 'Average score', value: `${summary.avgQuizScore}%` },
                { label: isVi ? 'Video da xem' : 'Videos viewed', value: summary.totalVideoViews },
                { label: isVi ? 'Tai lieu da xem' : 'Documents viewed', value: summary.totalDocumentViews },
                { label: isVi ? 'Bo the da xem' : 'Decks viewed', value: summary.totalFlashcardDeckViews },
              ].map((item) => (
                <Grid key={item.label} item xs={12} sm={6} md={4} lg={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="h4" color="text.primary" sx={{ mt: 1 }}>
                        {item.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} xl={8}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">
                        {isVi ? 'Bieu do cot hoat dong hoc tap' : 'Activity bar chart'}
                      </Typography>
                      <ActivityBarChart buckets={data?.buckets ?? []} period={period} isVi={isVi} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} xl={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">
                        {isVi ? 'Bieu do tron phan bo hoat dong' : 'Activity distribution chart'}
                      </Typography>
                      <DistributionDonut summary={summary} isVi={isVi} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">
                    {isVi ? 'Bieu do duong diem quiz trung binh' : 'Quiz score trend line'}
                  </Typography>
                  <ScoreTrendChart buckets={data?.buckets ?? []} period={period} isVi={isVi} />
                </Stack>
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </UserShell>
  )
}

