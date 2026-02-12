'use client'

import { useState, useEffect, useRef } from 'react'
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
import { FiHome, FiSettings, FiClock, FiPlay, FiPause, FiCalendar, FiMail, FiBookOpen, FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { Loader2 } from 'lucide-react'

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
  '--chart-1': '27 61% 35%',
  '--chart-2': '36 60% 31%',
  '--chart-3': '30 50% 40%',
  '--chart-4': '20 45% 45%',
  '--chart-5': '15 55% 38%',
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

interface ScheduleData {
  id: string
  agent_id: string
  status: string
  cron_expression: string
  timezone: string
  next_run_at?: string
  last_run_at?: string
}

interface HistoryEntry {
  id: string
  schedule_id: string
  agent_id: string
  status: string
  created_at: string
  completed_at?: string
  result?: DigestResult
}

function PaperCard({ paper }: { paper: Paper }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-border bg-card hover:border-accent/50 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-serif leading-tight mb-1" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
              {paper.title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {paper.authors}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
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
            <span>Significance</span>
            {expanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
              {paper.significance}
            </p>
          )}
        </div>
        <div className="pt-2">
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-foreground underline"
          >
            arXiv:{paper.arxiv_id}
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

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

  return <span className="font-mono text-lg">{timeLeft}</span>
}

function DashboardScreen({
  latestDigest,
  loading,
  onRunNow,
  onNavigate,
}: {
  latestDigest: DigestResult | null
  loading: boolean
  onRunNow: () => void
  onNavigate: (screen: string) => void
}) {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [scheduleHistory, setScheduleHistory] = useState<HistoryEntry[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [pausingSchedule, setPausingSchedule] = useState(false)
  const [recentExpanded, setRecentExpanded] = useState(false)

  useEffect(() => {
    loadScheduleData()
  }, [])

  const loadScheduleData = async () => {
    setLoadingSchedule(true)
    try {
      const schedule = await getSchedule(SCHEDULE_ID)
      if (schedule) {
        setScheduleData(schedule)
      }
      const historyResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (historyResult.success && Array.isArray(historyResult.executions)) {
        setScheduleHistory(historyResult.executions)
      }
    } catch (err) {
      console.error('Error loading schedule:', err)
    } finally {
      setLoadingSchedule(false)
    }
  }

  const handlePauseResume = async () => {
    if (!scheduleData) return
    setPausingSchedule(true)
    try {
      if (scheduleData.status === 'active') {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-wide mb-2">Dashboard</h1>
        <p className="text-muted-foreground" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>ArXiv daily research digest overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-accent" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Schedule Status</span>
              {loadingSchedule ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <Badge variant={scheduleData?.status === 'active' ? 'default' : 'secondary'}>
                  {scheduleData?.status === 'active' ? 'Active' : 'Paused'}
                </Badge>
              )}
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Run</span>
              <span className="text-sm font-medium">
                {scheduleData?.last_run_at ? formatDate(scheduleData.last_run_at) : 'Never'}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Papers Analyzed</span>
              <span className="text-2xl font-serif font-bold text-accent">
                {latestDigest?.papers_analyzed ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Papers Included</span>
              <span className="text-2xl font-serif font-bold text-accent">
                {latestDigest?.papers_included ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <FiClock className="w-5 h-5 text-accent" />
              Next Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-2">Time Until Next Digest</div>
              <div className="text-accent">
                <CountdownTimer targetTime={scheduleData?.next_run_at ?? null} />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {scheduleData?.cron_expression ? cronToHuman(scheduleData.cron_expression) : 'Daily at 11:15 PM IST'}
              </div>
            </div>
            <Separator className="bg-border" />
            <div className="flex gap-2">
              <Button
                onClick={handlePauseResume}
                disabled={loadingSchedule || pausingSchedule}
                variant="outline"
                className="flex-1"
              >
                {pausingSchedule ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : scheduleData?.status === 'active' ? (
                  <FiPause className="w-4 h-4 mr-2" />
                ) : (
                  <FiPlay className="w-4 h-4 mr-2" />
                )}
                {scheduleData?.status === 'active' ? 'Pause' : 'Resume'}
              </Button>
              <Button onClick={onRunNow} disabled={loading} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <FiPlay className="w-4 h-4 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {latestDigest && Array.isArray(latestDigest.top_papers) && latestDigest.top_papers.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif flex items-center gap-2">
                <FiBookOpen className="w-5 h-5 text-accent" />
                Recent Digest Preview
              </CardTitle>
              <button
                onClick={() => setRecentExpanded(!recentExpanded)}
                className="text-accent hover:text-accent-foreground transition-colors"
              >
                {recentExpanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
              </button>
            </div>
            <CardDescription>
              {latestDigest.execution_time ? formatDate(latestDigest.execution_time) : 'Latest execution'}
            </CardDescription>
          </CardHeader>
          {recentExpanded && (
            <CardContent>
              <div className="space-y-4">
                {latestDigest.top_papers.slice(0, 3).map((paper, idx) => (
                  <PaperCard key={idx} paper={paper} />
                ))}
                {latestDigest.top_papers.length > 3 && (
                  <Button
                    variant="outline"
                    onClick={() => onNavigate('history')}
                    className="w-full"
                  >
                    View All {latestDigest.top_papers.length} Papers
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <FiCalendar className="w-5 h-5 text-accent" />
            Recent Execution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchedule ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : scheduleHistory.length > 0 ? (
            <div className="space-y-3">
              {scheduleHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {entry.created_at ? formatDate(entry.created_at) : 'Unknown time'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.completed_at ? `Completed in ${Math.round((new Date(entry.completed_at).getTime() - new Date(entry.created_at).getTime()) / 1000)}s` : 'Running...'}
                    </div>
                  </div>
                  <Badge variant={entry.status === 'completed' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                    {entry.status}
                  </Badge>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => onNavigate('history')}
                className="w-full"
              >
                View Full History
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No execution history yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsScreen({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => void }) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings)
  const [saving, setSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSave = () => {
    if (!validateEmail(localSettings.email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')
    setSaving(true)
    setTimeout(() => {
      onSave(localSettings)
      setSaving(false)
    }, 500)
  }

  const toggleCategory = (category: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }))
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-wide mb-2">Settings</h1>
        <p className="text-muted-foreground" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>Configure your research digest preferences</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <FiMail className="w-5 h-5 text-accent" />
            Email Configuration
          </CardTitle>
          <CardDescription>Where to send the daily digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              value={localSettings.email}
              onChange={(e) => {
                setLocalSettings((prev) => ({ ...prev, email: e.target.value }))
                setEmailError('')
              }}
              placeholder="your.email@example.com"
              className="bg-input border-border"
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <FiBookOpen className="w-5 h-5 text-accent" />
            Research Categories
          </CardTitle>
          <CardDescription>Select ArXiv categories to monitor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ARXIV_CATEGORIES.map((cat) => (
              <div
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  localSettings.categories.includes(cat.value)
                    ? 'bg-accent/20 border-accent'
                    : 'bg-secondary/50 border-border hover:border-accent/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{cat.label}</div>
                    <div className="text-xs text-muted-foreground">{cat.value}</div>
                  </div>
                  {localSettings.categories.includes(cat.value) && (
                    <FiCheckCircle className="w-5 h-5 text-accent" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif">Paper Limit</CardTitle>
          <CardDescription>Maximum papers to include in digest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Papers per digest</span>
            <span className="text-2xl font-serif font-bold text-accent">{localSettings.paperLimit}</span>
          </div>
          <Slider
            value={[localSettings.paperLimit]}
            onValueChange={(value) => setLocalSettings((prev) => ({ ...prev, paperLimit: value[0] }))}
            min={1}
            max={25}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>25</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif">Summary Depth</CardTitle>
          <CardDescription>Choose between brief or detailed summaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div>
              <div className="text-sm font-medium">Detailed Summaries</div>
              <div className="text-xs text-muted-foreground">
                {localSettings.summaryDepth === 'detailed' ? 'In-depth analysis enabled' : 'Brief summaries enabled'}
              </div>
            </div>
            <Switch
              checked={localSettings.summaryDepth === 'detailed'}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, summaryDepth: checked ? 'detailed' : 'brief' }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          'Save Settings'
        )}
      </Button>
    </div>
  )
}

function HistoryScreen({ history }: { history: DigestResult[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const filteredHistory = history.filter((digest) => {
    const query = searchQuery.toLowerCase()
    return (
      digest.recipient_email?.toLowerCase().includes(query) ||
      digest.top_papers?.some(
        (paper) =>
          paper.title?.toLowerCase().includes(query) ||
          paper.authors?.toLowerCase().includes(query) ||
          paper.category?.toLowerCase().includes(query)
      )
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold tracking-wide mb-2">History</h1>
        <p className="text-muted-foreground" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>Past digest executions and delivered papers</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-serif">Search Digests</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search by title, authors, category, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-input border-border"
          />
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {filteredHistory.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center">
                <FiAlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No digests match your search' : 'No digest history yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredHistory.map((digest, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-serif text-lg mb-1">
                        {digest.execution_time ? formatDate(digest.execution_time) : 'Unknown Date'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <span>{digest.papers_analyzed ?? 0} analyzed</span>
                        <span>•</span>
                        <span>{digest.papers_included ?? 0} included</span>
                        {digest.recipient_email && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <FiMail className="w-3 h-3" />
                              {digest.recipient_email}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={digest.digest_sent ? 'default' : 'secondary'}>
                      {digest.digest_sent ? 'Delivered' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium">
                      {Array.isArray(digest.top_papers) ? digest.top_papers.length : 0} Papers
                    </span>
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      className="text-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                    >
                      <span className="text-sm">
                        {expandedIndex === idx ? 'Hide Papers' : 'Show Papers'}
                      </span>
                      {expandedIndex === idx ? (
                        <FiChevronUp className="w-4 h-4" />
                      ) : (
                        <FiChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedIndex === idx && Array.isArray(digest.top_papers) && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      {digest.top_papers.map((paper, paperIdx) => (
                        <PaperCard key={paperIdx} paper={paper} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function Home() {
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'settings' | 'history'>('dashboard')
  const [settings, setSettings] = useState<Settings>({
    email: 'researcher@example.com',
    categories: ['cs.AI', 'cs.LG'],
    paperLimit: 10,
    summaryDepth: 'detailed',
  })
  const [history, setHistory] = useState<DigestResult[]>([])
  const [latestDigest, setLatestDigest] = useState<DigestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [sampleDataEnabled, setSampleDataEnabled] = useState(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('arxiv_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }

    const savedHistory = localStorage.getItem('arxiv_history')
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory)
      setHistory(parsedHistory)
      if (parsedHistory.length > 0) {
        setLatestDigest(parsedHistory[0])
      }
    }
  }, [])

  useEffect(() => {
    if (sampleDataEnabled) {
      const sampleDigest: DigestResult = {
        papers_analyzed: 127,
        papers_included: 10,
        top_papers: [
          {
            arxiv_id: '2402.12345',
            title: 'Scaling Laws for Neural Language Models in the Post-GPT Era',
            authors: 'Smith, J., Johnson, A., Williams, B.',
            summary: 'This work investigates empirical scaling laws for transformer-based language models trained on diverse corpora. We find that model performance continues to improve predictably with increased compute, data, and parameters, with minimal diminishing returns up to 100B parameters.',
            significance: 'These findings suggest that continued scaling remains a viable path toward more capable AI systems, with important implications for resource allocation in large-scale AI research.',
            category: 'cs.LG',
          },
          {
            arxiv_id: '2402.23456',
            title: 'Quantum Error Correction via Topological Codes at Room Temperature',
            authors: 'Chen, L., Martinez, R., O\'Brien, K.',
            summary: 'We demonstrate the first room-temperature quantum error correction using topological surface codes on a 49-qubit superconducting processor. The logical qubit lifetime exceeds physical qubit coherence by a factor of 3.2.',
            significance: 'This breakthrough removes a major barrier to practical quantum computing by eliminating the need for extreme cooling, potentially accelerating the timeline to fault-tolerant quantum computers.',
            category: 'physics',
          },
          {
            arxiv_id: '2402.34567',
            title: 'Few-Shot Learning with Multimodal Retrieval-Augmented Generation',
            authors: 'Patel, S., Kim, H., Zhang, Y.',
            summary: 'We introduce a novel architecture that combines vision-language models with external knowledge retrieval to achieve state-of-the-art few-shot learning. Our method achieves 89% accuracy on ImageNet with only 5 examples per class.',
            significance: 'This approach dramatically reduces the data requirements for training visual recognition systems, making AI more accessible for specialized domains with limited labeled data.',
            category: 'cs.CV',
          },
        ],
        digest_sent: true,
        recipient_email: 'researcher@example.com',
        execution_time: new Date().toISOString(),
      }

      setLatestDigest(sampleDigest)
      setHistory([sampleDigest, { ...sampleDigest, execution_time: new Date(Date.now() - 86400000).toISOString() }])
    } else {
      const savedHistory = localStorage.getItem('arxiv_history')
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        setHistory(parsedHistory)
        if (parsedHistory.length > 0) {
          setLatestDigest(parsedHistory[0])
        }
      } else {
        setHistory([])
        setLatestDigest(null)
      }
    }
  }, [sampleDataEnabled])

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    localStorage.setItem('arxiv_settings', JSON.stringify(newSettings))
  }

  const handleRunNow = async () => {
    setLoading(true)
    try {
      const message = `Generate and send daily ArXiv research digest for papers published in the last 24 hours. Settings: email=${settings.email}, categories=${settings.categories.join(',')}, limit=${settings.paperLimit}, depth=${settings.summaryDepth}`
      const result = await callAIAgent(message, AGENT_ID)

      if (result.success && result.response?.result) {
        const digestResult = result.response.result as DigestResult
        const newHistory = [digestResult, ...history]
        setHistory(newHistory)
        setLatestDigest(digestResult)
        localStorage.setItem('arxiv_history', JSON.stringify(newHistory))
      }
    } catch (err) {
      console.error('Error running digest:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-sidebar-border bg-sidebar p-6 flex flex-col">
          <div className="mb-8">
            <h2 className="text-xl font-serif font-bold tracking-wide mb-1">ArXiv Digest</h2>
            <p className="text-xs text-sidebar-foreground/70" style={{ letterSpacing: '0.01em' }}>Daily Research Updates</p>
          </div>

          <nav className="flex-1 space-y-2">
            <button
              onClick={() => setActiveScreen('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeScreen === 'dashboard'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <FiHome className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveScreen('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeScreen === 'settings'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <FiSettings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>

            <button
              onClick={() => setActiveScreen('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeScreen === 'history'
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <FiClock className="w-5 h-5" />
              <span className="font-medium">History</span>
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-sidebar-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-sidebar-foreground">Sample Data</span>
              <Switch checked={sampleDataEnabled} onCheckedChange={setSampleDataEnabled} />
            </div>
            <p className="text-xs text-sidebar-foreground/70 leading-relaxed" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
              Toggle to preview with sample research papers
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                latestDigest={latestDigest}
                loading={loading}
                onRunNow={handleRunNow}
                onNavigate={setActiveScreen}
              />
            )}
            {activeScreen === 'settings' && <SettingsScreen settings={settings} onSave={handleSaveSettings} />}
            {activeScreen === 'history' && <HistoryScreen history={history} />}
          </div>
        </main>
      </div>

      <div className="fixed bottom-4 right-4 max-w-sm">
        <Card className="border-border bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-serif">Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Research Digest Agent</span>
                <Badge variant="default" className="text-xs">
                  {loading ? <FiLoader className="w-3 h-3 animate-spin" /> : 'Ready'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground" style={{ letterSpacing: '0.01em', lineHeight: '1.65' }}>
                Analyzes ArXiv papers, ranks by impact, generates summaries, sends via email
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
