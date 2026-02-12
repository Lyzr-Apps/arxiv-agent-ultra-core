'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { callAIAgent } from '@/lib/aiAgent'
import { getSchedule, pauseSchedule, resumeSchedule, getScheduleLogs, cronToHuman } from '@/lib/scheduler'
import { FiHome, FiSettings, FiClock, FiPlay, FiPause, FiCalendar, FiMail, FiBookOpen, FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertCircle, FiLoader, FiExternalLink } from 'react-icons/fi'

const THEME_VARS = {
  '--background': '20 30% 4%',
  '--foreground': '35 20% 90%',
  '--card': '20 25% 7%',
  '--card-foreground': '35 20% 90%',
  '--popover': '20 25% 10%',
  '--popover-foreground': '35 20% 90%',
  '--primary': '35 20% 90%',
  '--primary-foreground': '20 30% 8%',
  '--secondary': '20 20% 12%',
  '--secondary-foreground': '35 20% 90%',
  '--accent': '36 60% 31%',
  '--accent-foreground': '35 20% 95%',
  '--destructive': '0 63% 31%',
  '--destructive-foreground': '0 0% 98%',
  '--muted': '20 18% 15%',
  '--muted-foreground': '35 15% 55%',
  '--border': '20 18% 16%',
  '--input': '20 20% 20%',
  '--ring': '36 60% 31%',
  '--sidebar': '20 28% 6%',
  '--sidebar-foreground': '35 20% 90%',
  '--sidebar-border': '20 18% 12%',
  '--sidebar-primary': '36 60% 31%',
  '--sidebar-primary-foreground': '35 20% 95%',
  '--sidebar-accent': '20 18% 12%',
  '--sidebar-accent-foreground': '35 20% 90%',
} as React.CSSProperties

const AGENT_ID = '698e0f28a96cf8dd37d6a829'
const SCHEDULE_ID = '698e0f2debe6fd87d1dcc1c0'

const ARXIV_CATEGORIES = [
  { value: 'cs.AI', label: 'Artificial Intelligence' },
  { value: 'cs.LG', label: 'Machine Learning' },
  { value: 'cs.CV', label: 'Computer Vision' },
  { value: 'cs.CL', label: 'Computation and Language' },
  { value: 'cs.RO', label: 'Robotics' },
  { value: 'physics', label: 'Physics' },
  { value: 'math', label: 'Mathematics' },
  { value: 'q-bio', label: 'Quantitative Biology' },
  { value: 'stat.ML', label: 'Statistics - ML' },
]

interface Paper {
  arxiv_id: string
  title: string
  authors: string
  summary: string
  significance: string
  category: string
}

interface DigestResult {
  papers_analyzed: number
  papers_included: number
  top_papers: Paper[]
  digest_sent: boolean
  recipient_email: string
  execution_time: string
}

interface Settings {
  email: string
  categories: string[]
  paperLimit: number
  summaryDepth: 'brief' | 'detailed'
}

interface ScheduleInfo {
  id: string
  is_active: boolean
  cron_expression: string
  timezone: string
  next_run_time: string | null
  last_run_at: string | null
}

interface ExecutionLog {
  id: string
  executed_at: string
  success: boolean
  response_output: string
}

// Sidebar Navigation Component
function Sidebar({ activeScreen, onNavigate }: { activeScreen: string; onNavigate: (screen: string) => void }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'history', label: 'History', icon: FiClock },
  ]

  return (
    <div className="w-64 h-screen bg-[hsl(var(--sidebar))] border-r border-[hsl(var(--sidebar-border))] flex flex-col">
      {/* Logo/Title */}
      <div className="p-6 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center">
            <FiBookOpen className="w-5 h-5 text-[hsl(var(--sidebar-primary-foreground))]" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold text-[hsl(var(--sidebar-foreground))]" style={{ letterSpacing: '0.01em' }}>
              ArXiv Digest
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Daily Research Brief</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeScreen === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-lg'
                    : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium" style={{ letterSpacing: '0.01em' }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="px-3 py-2 rounded-lg bg-[hsl(var(--sidebar-accent))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Scheduled Run</p>
          <p className="text-sm font-medium text-[hsl(var(--sidebar-foreground))]">Daily at 11:15 PM IST</p>
        </div>
      </div>
    </div>
  )
}

// Paper Card Component
function PaperCard({ paper }: { paper: Paper }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-border bg-card hover:border-accent/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-serif leading-tight mb-2" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
              {paper.title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground" style={{ lineHeight: '1.65' }}>
              {paper.authors}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs bg-accent/20 text-accent-foreground border-accent/30">
            {paper.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-foreground/90 leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
            {paper.summary}
          </p>
        </div>
        <Separator className="bg-border" />
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-foreground transition-colors"
          >
            <span>Why This Matters</span>
            {expanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <p className="text-sm text-foreground/80 leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
                {paper.significance}
              </p>
            </div>
          )}
        </div>
        <div className="pt-2">
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-foreground transition-colors"
          >
            <span>arXiv:{paper.arxiv_id}</span>
            <FiExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

// Countdown Timer Component
function CountdownTimer({ targetTime }: { targetTime: string | null }) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (!targetTime) {
      setTimeLeft('Not scheduled')
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const target = new Date(targetTime).getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft('Running soon...')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [targetTime])

  return <span className="font-mono text-2xl font-semibold text-accent">{timeLeft}</span>
}

// Dashboard Screen Component
function DashboardScreen({
  latestDigest,
  loading,
  onRunNow,
}: {
  latestDigest: DigestResult | null
  loading: boolean
  onRunNow: () => void
}) {
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [pausingSchedule, setPausingSchedule] = useState(false)
  const [recentExpanded, setRecentExpanded] = useState(false)

  useEffect(() => {
    loadScheduleData()
  }, [])

  const loadScheduleData = async () => {
    setLoadingSchedule(true)
    try {
      const scheduleResult = await getSchedule(SCHEDULE_ID)
      if (scheduleResult.success && scheduleResult.schedule) {
        setScheduleInfo(scheduleResult.schedule as ScheduleInfo)
      }
      const logsResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (logsResult.success && Array.isArray(logsResult.executions)) {
        setExecutionLogs(logsResult.executions)
      }
    } catch (err) {
      console.error('Error loading schedule:', err)
    } finally {
      setLoadingSchedule(false)
    }
  }

  const handlePauseResume = async () => {
    if (!scheduleInfo) return
    setPausingSchedule(true)
    try {
      if (scheduleInfo.is_active) {
        await pauseSchedule(SCHEDULE_ID)
      } else {
        await resumeSchedule(SCHEDULE_ID)
      }
      await loadScheduleData()
    } catch (err) {
      console.error('Error toggling schedule:', err)
    } finally {
      setPausingSchedule(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2" style={{ letterSpacing: '0.01em' }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground" style={{ lineHeight: '1.65' }}>
            Monitor your daily ArXiv research digest
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Current Status Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2" style={{ letterSpacing: '0.01em' }}>
                <FiCheckCircle className="w-5 h-5 text-accent" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Schedule Status</span>
                {loadingSchedule ? (
                  <FiLoader className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge className={scheduleInfo?.is_active ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-yellow-900/30 text-yellow-400 border-yellow-700'}>
                    {scheduleInfo?.is_active ? 'Active' : 'Paused'}
                  </Badge>
                )}
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Last Run</span>
                <span className="text-sm font-medium text-foreground">
                  {scheduleInfo?.last_run_at ? new Date(scheduleInfo.last_run_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Never'}
                </span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Papers Analyzed</span>
                <span className="text-sm font-semibold text-accent">{latestDigest?.papers_analyzed || 0}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Papers Included</span>
                <span className="text-sm font-semibold text-accent">{latestDigest?.papers_included || 0}</span>
              </div>
              <Separator className="bg-border" />
              <div className="pt-2 flex gap-2">
                <Button
                  onClick={onRunNow}
                  disabled={loading}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {loading ? (
                    <>
                      <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <FiPlay className="w-4 h-4 mr-2" />
                      Run Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={handlePauseResume}
                  disabled={pausingSchedule || loadingSchedule}
                  variant="outline"
                  className="border-accent/30 hover:bg-accent/10"
                >
                  {pausingSchedule ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : scheduleInfo?.is_active ? (
                    <FiPause className="w-4 h-4" />
                  ) : (
                    <FiPlay className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Run Card */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-serif flex items-center gap-2" style={{ letterSpacing: '0.01em' }}>
                <FiCalendar className="w-5 h-5 text-accent" />
                Next Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Time Until Next Run</p>
                <CountdownTimer targetTime={scheduleInfo?.next_run_time || null} />
              </div>
              <Separator className="bg-border" />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Scheduled Time</span>
                  <span className="text-sm font-medium text-foreground">11:15 PM IST</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <span className="text-sm font-medium text-foreground">Daily</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Timezone</span>
                  <span className="text-sm font-medium text-foreground">{scheduleInfo?.timezone || 'Asia/Kolkata'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Digest Preview */}
        {latestDigest && (
          <Card className="border-border bg-card mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-serif flex items-center gap-2" style={{ letterSpacing: '0.01em' }}>
                  <FiMail className="w-5 h-5 text-accent" />
                  Recent Digest Preview
                </CardTitle>
                <button
                  onClick={() => setRecentExpanded(!recentExpanded)}
                  className="flex items-center gap-2 text-sm text-accent hover:text-accent-foreground transition-colors"
                >
                  {recentExpanded ? (
                    <>
                      <span>Collapse</span>
                      <FiChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Expand</span>
                      <FiChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <CardDescription>
                Sent to {latestDigest.recipient_email} on {new Date(latestDigest.execution_time).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            {recentExpanded && (
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(latestDigest.top_papers) && latestDigest.top_papers.slice(0, 3).map((paper, idx) => (
                    <PaperCard key={idx} paper={paper} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Execution History */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-serif flex items-center gap-2" style={{ letterSpacing: '0.01em' }}>
              <FiClock className="w-5 h-5 text-accent" />
              Recent Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-8">
                <FiLoader className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : executionLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No execution history yet</p>
            ) : (
              <div className="space-y-2">
                {executionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="flex items-center gap-3">
                      {log.success ? (
                        <FiCheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <FiAlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(log.executed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge className={log.success ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-red-900/30 text-red-400 border-red-700'}>
                      {log.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Settings Screen Component
function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arxiv_settings')
      return saved ? JSON.parse(saved) : {
        email: '',
        categories: ['cs.AI', 'cs.LG'],
        paperLimit: 10,
        summaryDepth: 'detailed' as const,
      }
    }
    return {
      email: '',
      categories: ['cs.AI', 'cs.LG'],
      paperLimit: 10,
      summaryDepth: 'detailed' as const,
    }
  })

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('arxiv_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleCategory = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
    }))
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2" style={{ letterSpacing: '0.01em' }}>
            Settings
          </h1>
          <p className="text-muted-foreground" style={{ lineHeight: '1.65' }}>
            Configure your research digest preferences
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-8">
            {/* Email Configuration */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium text-foreground flex items-center gap-2">
                <FiMail className="w-4 h-4 text-accent" />
                Email Address
              </Label>
              <p className="text-sm text-muted-foreground">Where should we send your daily digest?</p>
              <Input
                id="email"
                type="email"
                placeholder="researcher@university.edu"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="bg-input border-border focus:border-accent"
              />
            </div>

            <Separator className="bg-border" />

            {/* Research Categories */}
            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground flex items-center gap-2">
                <FiBookOpen className="w-4 h-4 text-accent" />
                Research Categories
              </Label>
              <p className="text-sm text-muted-foreground">Select the ArXiv categories you want to track</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ARXIV_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => toggleCategory(cat.value)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      settings.categories.includes(cat.value)
                        ? 'border-accent bg-accent/10 text-accent-foreground'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:border-accent/50'
                    }`}
                  >
                    <p className="text-xs font-mono mb-1">{cat.value}</p>
                    <p className="text-sm font-medium">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Paper Limit */}
            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground">
                Papers per Digest: {settings.paperLimit}
              </Label>
              <p className="text-sm text-muted-foreground">Maximum number of papers to include in each digest</p>
              <div className="pt-2">
                <Slider
                  value={[settings.paperLimit]}
                  onValueChange={([value]) => setSettings({ ...settings, paperLimit: value })}
                  min={1}
                  max={25}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>1 paper</span>
                  <span>25 papers</span>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Summary Depth */}
            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground">Summary Depth</Label>
              <p className="text-sm text-muted-foreground">Choose the level of detail for paper summaries</p>
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Detailed Summaries</p>
                  <p className="text-xs text-muted-foreground">Include comprehensive analysis and significance</p>
                </div>
                <Switch
                  checked={settings.summaryDepth === 'detailed'}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, summaryDepth: checked ? 'detailed' : 'brief' })
                  }
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
              >
                {saved ? (
                  <>
                    <FiCheckCircle className="w-4 h-4 mr-2" />
                    Settings Saved
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// History Screen Component
function HistoryScreen() {
  const [history, setHistory] = useState<DigestResult[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem('arxiv_history')
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  const toggleExpanded = (idx: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const filteredHistory = history.filter((digest) =>
    digest.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    digest.top_papers?.some((paper) =>
      paper.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paper.authors.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2" style={{ letterSpacing: '0.01em' }}>
            History
          </h1>
          <p className="text-muted-foreground" style={{ lineHeight: '1.65' }}>
            Browse past research digests
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search digests by email or paper title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-input border-border focus:border-accent"
          />
        </div>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <FiClock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No digest history found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((digest, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-serif" style={{ letterSpacing: '0.01em' }}>
                        {new Date(digest.execution_time).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </CardTitle>
                      <CardDescription>
                        {digest.papers_included} papers • Sent to {digest.recipient_email}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={digest.digest_sent ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-red-900/30 text-red-400 border-red-700'}>
                        {digest.digest_sent ? 'Delivered' : 'Failed'}
                      </Badge>
                      <button
                        onClick={() => toggleExpanded(idx)}
                        className="p-2 hover:bg-accent/10 rounded transition-colors"
                      >
                        {expandedIds.has(idx) ? (
                          <FiChevronUp className="w-5 h-5 text-accent" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-accent" />
                        )}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                {expandedIds.has(idx) && (
                  <CardContent>
                    <div className="space-y-4">
                      {Array.isArray(digest.top_papers) && digest.top_papers.map((paper, paperIdx) => (
                        <PaperCard key={paperIdx} paper={paper} />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main App Component
export default function ArxivDigestApp() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [latestDigest, setLatestDigest] = useState<DigestResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('arxiv_latest_digest')
    if (saved) {
      setLatestDigest(JSON.parse(saved))
    }
  }, [])

  const handleRunNow = async () => {
    setLoading(true)
    try {
      const settings = JSON.parse(localStorage.getItem('arxiv_settings') || '{"email":"","categories":["cs.AI","cs.LG"],"paperLimit":10,"summaryDepth":"detailed"}')

      const message = `Generate a research digest for the following categories: ${settings.categories.join(', ')}. Include up to ${settings.paperLimit} papers. Send to: ${settings.email}. Use ${settings.summaryDepth} summary style.`

      const result = await callAIAgent(AGENT_ID, message)

      if (result?.response?.result) {
        const digestResult = result.response.result
        setLatestDigest(digestResult)
        localStorage.setItem('arxiv_latest_digest', JSON.stringify(digestResult))

        const history = JSON.parse(localStorage.getItem('arxiv_history') || '[]')
        history.unshift(digestResult)
        localStorage.setItem('arxiv_history', JSON.stringify(history.slice(0, 20)))
      }
    } catch (err) {
      console.error('Error running digest:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={THEME_VARS}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />

        {activeScreen === 'dashboard' && (
          <DashboardScreen latestDigest={latestDigest} loading={loading} onRunNow={handleRunNow} />
        )}

        {activeScreen === 'settings' && <SettingsScreen />}

        {activeScreen === 'history' && <HistoryScreen />}
      </div>
    </div>
  )
}
