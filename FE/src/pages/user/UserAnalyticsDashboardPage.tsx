import React from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
  const barWidth = Math.max(18, Math.min(42, groupWidth * 0.55))
  const maxValue = Math.max(
    1,
    ...buckets.map(
      (bucket) => bucket.quizAttempts + bucket.videoViews + bucket.documentViews + bucket.flashcardDeckViews
    )
  )
  const labelStep = Math.max(1, Math.ceil(buckets.length / 8))
  const [hovered, setHovered] = React.useState<number | null>(null)
  const tooltip = hovered !== null ? buckets[hovered] : null

  return (
    <Box sx={{ overflowX: 'auto', position: 'relative' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        sx={{ height: 280, minWidth: 720, width: '100%', display: 'block' }}
        onMouseLeave={() => setHovered(null)}
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
          const groupLeft = left + bucketIndex * groupWidth + (groupWidth - barWidth) / 2
          const label = formatBucketLabel(bucket.bucketStart, period)
          const totalValue = bucket.quizAttempts + bucket.videoViews + bucket.documentViews + bucket.flashcardDeckViews
          const scaled = (totalValue / maxValue) * plotHeight
          const y = top + plotHeight - scaled
          return (
            <g key={bucket.bucketKey}>
              <rect
                x={groupLeft}
                y={y}
                width={barWidth}
                height={scaled}
                rx={6}
                fill="#4f46e5"
                opacity={0.92}
                onMouseEnter={() => setHovered(bucketIndex)}
              />
              {bucketIndex % labelStep === 0 && (
                <text
                  x={groupLeft + barWidth / 2}
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

      {tooltip && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 16,
            bgcolor: 'common.white',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
            minWidth: 180,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {formatBucketLabel(tooltip.bucketStart, period)}
          </Typography>
          <Stack spacing={0.5} mt={1}>
            {activitySeries.map((series) => (
              <Stack key={series.key} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series.color }} />
                  <Typography variant="caption" color="text.secondary">
                    {isVi ? series.labelVi : series.labelEn}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
                  {tooltip[series.key]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

const ScoreTrendChart: React.FC<{ buckets: LearningAnalyticsBucket[]; period: AnalyticsPeriod; isVi: boolean }> = ({ buckets, period, isVi }) => {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const hasScoreData = buckets.some((bucket) => bucket.quizAttempts > 0 || bucket.videoViews > 0 || bucket.documentViews > 0 || bucket.flashcardDeckViews > 0)
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

  const totalSeries = buckets.map((bucket) => bucket.quizAttempts + bucket.videoViews + bucket.documentViews + bucket.flashcardDeckViews)
  const quizSeries = buckets.map((bucket) => bucket.quizAttempts)
  const maxSeriesValue = Math.max(1, ...totalSeries, ...quizSeries)

  const pointsTotal = buckets.map((bucket, index) => {
    const x = left + (index / Math.max(1, buckets.length - 1)) * plotWidth
    const value = bucket.quizAttempts + bucket.videoViews + bucket.documentViews + bucket.flashcardDeckViews
    const y = top + ((maxSeriesValue - value) / maxSeriesValue) * plotHeight
    return { x, y, bucket, value }
  })

  const pointsQuiz = buckets.map((bucket, index) => {
    const x = left + (index / Math.max(1, buckets.length - 1)) * plotWidth
    const value = bucket.quizAttempts
    const y = top + ((maxSeriesValue - value) / maxSeriesValue) * plotHeight
    return { x, y, bucket, value }
  })

  const linePathTotal = pointsTotal
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')

  const linePathQuiz = pointsQuiz
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ')

  const tooltip = hovered !== null ? buckets[hovered] : null

  return (
    <Box sx={{ overflowX: 'auto', position: 'relative' }}>
      <Box
        component="svg"
        viewBox={`0 0 ${width} ${height}`}
        sx={{ height: 280, minWidth: 680, width: '100%', display: 'block' }}
        onMouseLeave={() => setHovered(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + (1 - ratio) * plotHeight
          return (
            <g key={ratio}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            </g>
          )
        })}

        <path d={linePathTotal} fill="none" stroke="#4f46e5" strokeWidth={3} />
        <path d={linePathQuiz} fill="none" stroke="#93c5fd" strokeWidth={3} />
        {pointsTotal.map((point, index) => (
          <g key={`${point.bucket.bucketKey}-total`}>
            <circle cx={point.x} cy={point.y} r={4} fill="#fff" stroke="#4f46e5" strokeWidth={2} />
            <rect
              x={point.x - 12}
              y={top}
              width={24}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
            />
            {index % labelStep === 0 && (
              <text x={point.x} y={height - 14} textAnchor="middle" fontSize="11" fill="#6b7280">
                {formatBucketLabel(point.bucket.bucketStart, period)}
              </text>
            )}
          </g>
        ))}
      </Box>

      {tooltip && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 16,
            bgcolor: 'common.white',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
            minWidth: 190,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {formatBucketLabel(tooltip.bucketStart, period)}
          </Typography>
          <Stack spacing={0.5} mt={1}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4f46e5' }} />
                <Typography variant="caption" color="text.secondary">
                  {isVi ? 'Tong hoat dong' : 'Total activity'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
                {tooltip.quizAttempts + tooltip.videoViews + tooltip.documentViews + tooltip.flashcardDeckViews}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#93c5fd' }} />
                <Typography variant="caption" color="text.secondary">
                  {isVi ? 'Quiz' : 'Quiz attempts'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
                {tooltip.quizAttempts}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}
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
  const avgScore = Math.max(0, Math.min(100, Math.round(summary.avgQuizScore)))
  const buckets = data?.buckets ?? []
  const totalActivityByBucket = buckets.map((bucket) =>
    bucket.quizAttempts + bucket.videoViews + bucket.documentViews + bucket.flashcardDeckViews
  )
  const changePercent = (values: number[]) => {
    if (values.length < 2) return null
    const last = values[values.length - 1]
    const prev = values[values.length - 2]
    if (prev === 0) return null
    return Math.round(((last - prev) / prev) * 1000) / 10
  }
  const quizChange = changePercent(buckets.map((b) => b.quizAttempts))
  const activityChange = changePercent(totalActivityByBucket)

  return (
    <UserShell
      titleEn="Learning Analytics Dashboard"
      titleVi="Bang thong ke hoc tap"
      subtitleEn="Visualize quiz, content views, and score trends"
      subtitleVi="Bieu do hoa quiz, luot xem noi dung va xu huong diem so"
    >
      <Stack spacing={3}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Stack>
                <Typography variant="h6">{isVi ? 'Thong ke hoc tap' : 'Learning statistics'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {isVi ? 'Tong hop hoat dong hoc tap theo thoi gian' : 'Overview of learning activity by time range'}
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
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
            </Stack>
          </CardContent>
        </Card>

        {error && !isLoading && <Alert severity="error">{error}</Alert>}

        {isLoading ? (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            </CardContent>
          </Card>
        ) : (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} xl={7}>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: 'grey.100',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MaterialIcon icon="quiz" size="sm" />
                            </Box>
                            {quizChange !== null && (
                              <Chip
                                size="small"
                                color={quizChange >= 0 ? 'success' : 'error'}
                                label={`${quizChange >= 0 ? '+' : ''}${quizChange}%`}
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                            {isVi ? 'Quiz da lam' : 'Quiz attempts'}
                          </Typography>
                          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                            {summary.totalQuizAttempts}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: 'grey.100',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MaterialIcon icon="auto_graph" size="sm" />
                            </Box>
                            {activityChange !== null && (
                              <Chip
                                size="small"
                                color={activityChange >= 0 ? 'success' : 'error'}
                                label={`${activityChange >= 0 ? '+' : ''}${activityChange}%`}
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                            {isVi ? 'Tong hoat dong' : 'Total activity'}
                          </Typography>
                          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
                            {summary.totalQuizAttempts + summary.totalVideoViews + summary.totalDocumentViews + summary.totalFlashcardDeckViews}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Card variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                        <Typography variant="h6">
                          {isVi ? 'Tong quan hoat dong hang thang' : 'Monthly activity overview'}
                        </Typography>
                        <Button variant="text" size="small">
                          {isVi ? 'Xem them' : 'View more'}
                        </Button>
                      </Stack>
                      <Box mt={2}>
                        <ActivityBarChart buckets={buckets} period={period} isVi={isVi} />
                      </Box>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

              <Grid item xs={12} xl={5}>
                <Card variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6">
                            {isVi ? 'Muc tieu thang' : 'Monthly target'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {isVi ? 'Ty le diem trung binh so voi muc tieu' : 'Average score compared with target'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ position: 'relative', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box component="svg" viewBox="0 0 240 140" sx={{ width: '100%', height: 200 }}>
                          <path
                            d="M20 120 A100 100 0 0 1 220 120"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth={14}
                            strokeLinecap="round"
                          />
                          <path
                            d="M20 120 A100 100 0 0 1 220 120"
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth={14}
                            strokeLinecap="round"
                            pathLength={100}
                            strokeDasharray={`${avgScore} 100`}
                          />
                        </Box>
                        <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                          <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            {avgScore}%
                          </Typography>
                          <Chip size="small" color="success" label="+10%" sx={{ mt: 1 }} />
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" align="center">
                        {isVi ? 'Diem trung binh dang o muc kha. Hay tiep tuc duy tri!' : 'Your average score is trending well. Keep it up!'}
                      </Typography>

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {[
                          { label: isVi ? 'Video' : 'Video', value: summary.totalVideoViews },
                          { label: isVi ? 'Tai lieu' : 'Documents', value: summary.totalDocumentViews },
                          { label: isVi ? 'Bo the' : 'Decks', value: summary.totalFlashcardDeckViews },
                        ].map((item) => (
                          <Grid item xs={4} key={item.label}>
                            <Stack spacing={0.5} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {item.label}
                              </Typography>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {item.value}
                              </Typography>
                            </Stack>
                          </Grid>
                        ))}
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6">
                        {isVi ? 'Thong ke hoat dong' : 'Statistics'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isVi ? 'So luot quiz va tong hoat dong theo thang' : 'Quiz attempts and total activity trend'}
                      </Typography>
                    </Box>
                  </Stack>
                  <ScoreTrendChart buckets={buckets} period={period} isVi={isVi} />
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {isVi ? 'Phan bo hoat dong' : 'Activity distribution'}
                </Typography>
                <DistributionDonut summary={summary} isVi={isVi} />
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </UserShell>
  )
}

