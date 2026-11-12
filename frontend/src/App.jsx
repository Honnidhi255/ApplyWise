import ReactMarkdown from 'react-markdown';
import { useEffect, useMemo, useState } from 'react'
import "./App.css"

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/applications`
const AI_URL = `${import.meta.env.VITE_AI_URL || 'http://127.0.0.1:8000'}/api/analyze`

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected']

const COLORS = {
    Applied: '#6585F5',
    Interview: '#9B7AF5',
    Offer: '#2EB88A',
    Rejected: '#F17D8B',
}

function safeLower(value) {
    return String(value || '').toLowerCase()
}

function getMatchScore(text) {
    const patterns = [
        /(?:estimated\s+)?(?:job\s+)?match\s+score\s*[:\-–]?\s*(\d{1,3})\s*%?/i,
        /score\s*[:\-–]\s*(\d{1,3})\s*%?/i,
        /(\d{1,3})\s*\/\s*100/,
    ]

    for (const pattern of patterns) {
        const match = String(text || '').match(pattern)
        if (match) {
            return Math.max(0, Math.min(100, Number(match[1])))
        }
    }

    return null
}

function parseAnalysisSections(text) {
    const source = String(text || '')
    const lines = source.split('\n').map((line) => line.trim()).filter(Boolean)
    const sections = []
    let current = { title: 'Analysis', items: [] }

    for (const line of lines) {
        const cleaned = line
            .replace(/^#{1,6}\s*/, '')
            .replace(/^\d+[).]\s*/, '')

        const isHeading =
            /^(\*\*.*\*\*|skills that match|matching skills|skill gaps|skills to improve|preparation plan|recommended topics|important skills|analysis|estimated job match score)/i.test(cleaned) &&
            cleaned.length < 100

        if (isHeading) {
            if (current.items.length || current.title !== 'Analysis') {
                sections.push(current)
            }

            current = {
                title: cleaned.replace(/\*\*/g, '').replace(/:$/, ''),
                items: [],
            }
        } else {
            current.items.push(
                line.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '')
            )
        }
    }

    if (current.items.length || !sections.length) {
        sections.push(current)
    }

    return sections.filter((section) => section.items.length)
}

function DonutChart({ items, total }) {
    const radius = 48
    const circumference = 2 * Math.PI * radius
    let offset = 0

    if (!total) {
        return (
            <div className="donut-wrap">
                <svg
                    viewBox="0 0 120 120"
                    className="donut-chart"
                    role="img"
                    aria-label="No applications yet"
                >
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke="#EDF0F7"
                        strokeWidth="14"
                    />
                    <text
                        x="60"
                        y="57"
                        textAnchor="middle"
                        className="donut-total"
                    >
                        0
                    </text>
                    <text
                        x="60"
                        y="72"
                        textAnchor="middle"
                        className="donut-caption"
                    >
                        total
                    </text>
                </svg>
            </div>
        )
    }

    return (
        <div className="donut-wrap">
            <svg
                viewBox="0 0 120 120"
                className="donut-chart"
                role="img"
                aria-label={`Application status distribution, ${total} total`}
            >
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#EDF0F7"
                    strokeWidth="14"
                />

                {items.filter((item) => item.count > 0).map((item) => {
                    const length = (item.count / total) * circumference

                    const circle = (
                        <circle
                            key={item.label}
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="14"
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 60 60)"
                            strokeLinecap="butt"
                        />
                    )

                    offset += length
                    return circle
                })}

                <text
                    x="60"
                    y="57"
                    textAnchor="middle"
                    className="donut-total"
                >
                    {total}
                </text>

                <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    className="donut-caption"
                >
                    total
                </text>
            </svg>
        </div>
    )
}

function App() {
    const [applications, setApplications] = useState([])
    const [page, setPage] = useState('dashboard')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [company, setCompany] = useState('')
    const [role, setRole] = useState('')
    const [status, setStatus] = useState('Applied')
    const [appliedDate, setAppliedDate] = useState('')
    const [jobUrl, setJobUrl] = useState('')
    const [notes, setNotes] = useState('')

    const [skills, setSkills] = useState('')
    const [jobDescription, setJobDescription] = useState('')
    const [aiAnalysis, setAiAnalysis] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    const [aiError, setAiError] = useState('')

    async function fetchApplications() {
        try {
            const response = await fetch(API_URL)

            if (!response.ok) {
                throw new Error('Failed to fetch applications')
            }

            const data = await response.json()
            setApplications(Array.isArray(data) ? data : [])
            setError('')
        } catch (err) {
            console.error(err)
            setError(
                'Could not load applications. Make sure Spring Boot is running on port 8080.'
            )
        }
    }

    useEffect(() => {
        fetchApplications()
    }, [])

    function resetForm() {
        setCompany('')
        setRole('')
        setStatus('Applied')
        setAppliedDate('')
        setJobUrl('')
        setNotes('')
        setEditingId(null)
        setShowForm(false)
        setError('')
    }

    function startEditing(application) {
        setCompany(application.company || '')
        setRole(application.role || '')
        setStatus(application.status || 'Applied')
        setAppliedDate(application.appliedDate || '')
        setJobUrl(application.jobUrl || '')
        setNotes(application.notes || '')
        setEditingId(application.id)
        setShowForm(true)
        setPage('applications')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function handleSaveApplication(event) {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const isEditing = editingId !== null

            const response = await fetch(
                isEditing ? `${API_URL}/${editingId}` : API_URL,
                {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company: company.trim(),
                        role: role.trim(),
                        status,
                        appliedDate: appliedDate || null,
                        jobUrl: jobUrl.trim(),
                        notes: notes.trim()
                    }),
                }
            )

            if (!response.ok) {
                throw new Error(
                    'Could not save application. Please check the backend.'
                )
            }

            await fetchApplications()
            resetForm()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleDeleteApplication(id) {
        if (!window.confirm('Delete this application?')) return

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Could not delete application.')
            }

            await fetchApplications()

            if (editingId === id) {
                resetForm()
            }
        } catch (err) {
            setError(err.message)
        }
    }

    async function handleAnalyze(event) {
        event.preventDefault()
        setAiLoading(true)
        setAiError('')
        setAiAnalysis('')

        try {
            const response = await fetch(AI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    skills: skills.trim(),
                    job_description: jobDescription.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'AI analysis failed.')
            }

            setAiAnalysis(data.analysis || 'No analysis was returned.')
        } catch (err) {
            setAiError(
                `${err.message} Check that the Python AI service is running on port 8000.`
            )
        } finally {
            setAiLoading(false)
        }
    }

    const counts = useMemo(() => {
        const result = {
            Applied: 0,
            Interview: 0,
            Offer: 0,
            Rejected: 0,
        }

        applications.forEach((application) => {
            const found = STATUSES.find(
                (item) => safeLower(item) === safeLower(application.status)
            )

            if (found) result[found] += 1
        })

        return result
    }, [applications])

    const total = applications.length
    const interviewRate = total
        ? Math.round((counts.Interview / total) * 100)
        : 0
    const activeCount = counts.Applied + counts.Interview
    const offerRate = total
        ? Math.round((counts.Offer / total) * 100)
        : 0

    const filteredApplications = useMemo(() => {
        const query = searchTerm.toLowerCase().trim()

        return applications.filter((application) => {
            const matchesQuery =
                safeLower(application.company).includes(query) ||
                safeLower(application.role).includes(query)

            const matchesStatus =
                statusFilter === 'All' ||
                safeLower(application.status) === safeLower(statusFilter)

            return matchesQuery && matchesStatus
        })
    }, [applications, searchTerm, statusFilter])

    const statusItems = STATUSES.map((label) => ({
        label,
        count: counts[label],
        color: COLORS[label],
    }))

    const matchScore = getMatchScore(aiAnalysis)
    const analysisSections = parseAnalysisSections(aiAnalysis)

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">A</div>
                    <div>
                        <div className="brand-name">ApplyWise</div>
                        <div className="brand-tagline">CAREER INTELLIGENCE</div>
                    </div>
                </div>

                <div className="nav-label">WORKSPACE</div>

                <nav className="side-nav">
                    <button
                        className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setPage('dashboard')}
                    >
                        <span className="nav-icon">▦</span> Overview
                    </button>

                    <button
                        className={`nav-item ${page === 'applications' ? 'active' : ''}`}
                        onClick={() => setPage('applications')}
                    >
                        <span className="nav-icon">▤</span> Applications
                        <span className="nav-count">{total}</span>
                    </button>

                    <button
                        className={`nav-item ${page === 'ai' ? 'active' : ''}`}
                        onClick={() => setPage('ai')}
                    >
                        <span className="nav-icon">✧</span> AI Job Match
                    </button>
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-tip-icon">✦</div>
                    <p className="sidebar-tip-title">A little progress every day</p>
                    <p className="sidebar-tip-copy">
                        Every application is a step toward your next opportunity.
                    </p>
                    <div className="sidebar-footer">
                        APPLYWISE · YOUR CAREER, ORGANIZED
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <div>
                        <div className="eyebrow">
                            CAREER WORKSPACE /{' '}
                            {page === 'ai'
                                ? 'AI JOB MATCH'
                                : page === 'applications'
                                    ? 'APPLICATIONS'
                                    : 'OVERVIEW'}
                        </div>

                        <h1>
                            {page === 'ai'
                                ? 'AI Job Match Analyzer'
                                : page === 'applications'
                                    ? 'Your Applications'
                                    : 'Good to see you again.'}
                        </h1>

                        <p>
                            {page === 'ai'
                                ? 'Understand how your skills align with your next opportunity.'
                                : page === 'applications'
                                    ? 'Manage every opportunity in one organized workspace.'
                                    : 'A clear view of your job search, progress, and next steps.'}
                        </p>
                    </div>

                    {page !== 'ai' && (
                        <button
                            className="primary-button"
                            onClick={() => {
                                setPage('applications')
                                setShowForm(true)
                                setEditingId(null)
                                setCompany('')
                                setRole('')
                                setStatus('Applied')
                                setAppliedDate('')
                                setJobUrl('')
                                setNotes('')
                            }}
                        >
                            <span>＋</span> Add application
                        </button>
                    )}
                </header>

                {error && (
                    <div className="alert error-alert" role="alert">
                        {error}
                    </div>
                )}

                {page === 'dashboard' && (
                    <>
                        <section className="welcome-banner">
                            <div className="welcome-content">
                    <span className="banner-label">
                      YOUR NEXT CHAPTER STARTS HERE
                    </span>
                                <h2>Small steps. Big opportunities.</h2>
                                <p>
                                    Keep your search focused, your progress visible, and your
                                    next move clear.
                                </p>
                                <button
                                    className="banner-button"
                                    onClick={() => setPage('ai')}
                                >
                                    Explore AI job match <span>↗</span>
                                </button>
                            </div>

                            <div className="banner-art" aria-hidden="true">
                                <div className="art-orbit orbit-one" />
                                <div className="art-orbit orbit-two" />
                                <div className="art-star">✦</div>
                                <div className="art-card">
                                    <span>CAREER GOAL</span>
                                    <strong>In progress</strong>
                                    <div className="art-progress"><i /></div>
                                </div>
                                <div className="art-spark">✧</div>
                            </div>
                        </section>

                        <section className="section-block">
                            <div className="section-heading">
                                <div>
                                    <h2>Search performance</h2>
                                    <p>Your current job-search snapshot</p>
                                </div>
                                <span className="live-label"><i /> LIVE DATA</span>
                            </div>

                            <div className="metric-grid">
                                <article className="metric-card">
                                    <div className="metric-top">
                                        <span>Total applications</span>
                                        <span className="metric-icon purple">▤</span>
                                    </div>
                                    <div className="metric-value">{total}</div>
                                    <div className="metric-foot">All tracked opportunities</div>
                                </article>

                                <article className="metric-card">
                                    <div className="metric-top">
                                        <span>Interview rate</span>
                                        <span className="metric-icon blue">↗</span>
                                    </div>
                                    <div className="metric-value">
                                        {interviewRate}<small>%</small>
                                    </div>
                                    <div className="metric-foot">
                                        Applications at interview stage
                                    </div>
                                </article>

                                <article className="metric-card">
                                    <div className="metric-top">
                                        <span>Offers received</span>
                                        <span className="metric-icon green">✦</span>
                                    </div>
                                    <div className="metric-value">{counts.Offer}</div>
                                    <div className="metric-foot">
                                        {offerRate}% of all applications
                                    </div>
                                </article>

                                <article className="metric-card">
                                    <div className="metric-top">
                                        <span>Active pipeline</span>
                                        <span className="metric-icon orange">◷</span>
                                    </div>
                                    <div className="metric-value">{activeCount}</div>
                                    <div className="metric-foot">Applied or interviewing</div>
                                </article>
                            </div>
                        </section>

                        <section className="analytics-grid">
                            <article className="panel status-panel">
                                <div className="panel-heading">
                                    <div>
                                        <h2>Application pipeline</h2>
                                        <p>Distribution by current status</p>
                                    </div>
                                    <span className="panel-menu">•••</span>
                                </div>

                                <div className="pipeline-content">
                                    <DonutChart items={statusItems} total={total} />

                                    <div className="legend-list">
                                        {statusItems.map((item) => (
                                            <div className="legend-row" key={item.label}>
                              <span className="legend-name">
                                <i style={{ background: item.color }} />
                                  {item.label}
                              </span>
                                                <strong>{item.count}</strong>
                                                <span className="legend-percent">
                                {total
                                    ? Math.round((item.count / total) * 100)
                                    : 0}%
                              </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="panel-footnote">
                                    Status breakdown updates when you add or edit an application.
                                </div>
                            </article>

                            <article className="panel progress-panel">
                                <div className="panel-heading">
                                    <div>
                                        <h2>Pipeline overview</h2>
                                        <p>Progress across each stage</p>
                                    </div>
                                    <span className="pill-subtle">THIS SEARCH</span>
                                </div>

                                <div className="pipeline-bars">
                                    {statusItems.map((item) => (
                                        <div className="pipeline-bar-row" key={item.label}>
                                            <div className="bar-label">
                                                <span>{item.label}</span>
                                                <strong>{item.count}</strong>
                                            </div>
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: `${
                                                            total ? (item.count / total) * 100 : 0
                                                        }%`,
                                                        background: item.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="insight-note">
                                    <span>✧</span>
                                    <div>
                                        <strong>Keep your momentum</strong>
                                        <p>
                                            {total === 0
                                                ? 'Add your first application to start building your job-search insights.'
                                                : counts.Interview === 0
                                                    ? 'Tailor each resume to the role and keep applying consistently.'
                                                    : counts.Offer === 0
                                                        ? 'Prepare stories and technical examples for your interviews.'
                                                        : 'You have an offer recorded. Keep your records updated as you decide next steps.'}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <section className="panel recent-panel">
                            <div className="panel-heading recent-heading">
                                <div>
                                    <h2>Recent applications</h2>
                                    <p>Your latest tracked opportunities</p>
                                </div>
                                <button
                                    className="text-button"
                                    onClick={() => setPage('applications')}
                                >
                                    View all applications <span>→</span>
                                </button>
                            </div>

                            {applications.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">▤</div>
                                    <strong>Your job-search story starts here</strong>
                                    <p>
                                        Add your first application to see your progress and
                                        analytics.
                                    </p>
                                    <button
                                        className="primary-button"
                                        onClick={() => {
                                            setPage('applications')
                                            setShowForm(true)
                                        }}
                                    >
                                        ＋ Add first application
                                    </button>
                                </div>
                            ) : (
                                <div className="table-scroll">
                                    <table className="application-table">
                                        <thead>
                                        <tr>
                                            <th>COMPANY</th>
                                            <th>JOB ROLE</th>
                                            <th>STATUS</th>
                                            <th>APPLICATION ID</th>
                                            <th>ACTION</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {[...applications].slice(-5).reverse().map((application) => (
                                            <tr key={application.id}>
                                                <td>
                                                    <div className="company-cell">
                                    <span className="company-avatar">
                                      {String(application.company || '?')
                                          .charAt(0)
                                          .toUpperCase()}
                                    </span>
                                                        <strong>{application.company}</strong>
                                                    </div>
                                                </td>
                                                <td>{application.role}</td>
                                                <td><StatusBadge status={application.status} /></td>
                                                <td className="muted-cell">#{application.id}</td>
                                                <td>
                                                    <button
                                                        className="table-action"
                                                        onClick={() => startEditing(application)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {page === 'applications' && (
                    <section className="panel applications-page">
                        <div className="panel-heading">
                            <div>
                                <h2>Manage applications</h2>
                                <p>Add, search, edit, and track your job opportunities.</p>
                            </div>
                            <button
                                className="primary-button"
                                onClick={() => {
                                    setEditingId(null)
                                    setCompany('')
                                    setRole('')
                                    setStatus('Applied')
                                    setAppliedDate('')
                                    setJobUrl('')
                                    setNotes('')
                                    setShowForm(!showForm)
                                }}
                            >
                                ＋ Add application
                            </button>
                        </div>

                        {showForm && (
                            <form className="application-form" onSubmit={handleSaveApplication}>
                                <h3>{editingId !== null ? 'Edit application' : 'New application'}</h3>

                                <label htmlFor="company">Company name</label>
                                <input
                                    id="company"
                                    value={company}
                                    onChange={(event) => setCompany(event.target.value)}
                                    placeholder="e.g. Google"
                                    required
                                />

                                <label htmlFor="role">Job role</label>
                                <input
                                    id="role"
                                    value={role}
                                    onChange={(event) => setRole(event.target.value)}
                                    placeholder="e.g. Software Engineer"
                                    required
                                />

                                <label htmlFor="status">Application status</label>
                                <select
                                    id="status"
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value)}
                                >
                                    {STATUSES.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>

                                <label htmlFor="appliedDate">Applied Date</label>
                                <input
                                    id="appliedDate"
                                    type="date"
                                    value={appliedDate}
                                    onChange={(event) => setAppliedDate(event.target.value)}
                                />

                                <label htmlFor="jobUrl">Job Posting URL</label>
                                <input
                                    id="jobUrl"
                                    type="url"
                                    value={jobUrl}
                                    onChange={(event) => setJobUrl(event.target.value)}
                                    placeholder="https://company.com/careers/job..."
                                />

                                <label htmlFor="notes">Notes</label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Recruiter details, follow-up information, interview notes..."
                                    rows={4}
                                />

                                <div className="form-actions">
                                    <button className="primary-button" type="submit" disabled={loading}>
                                        {loading ? 'Saving...' : editingId !== null ? 'Save changes' : 'Save application'}
                                    </button>
                                    <button className="secondary-button" type="button" onClick={resetForm}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="application-filters">
                            <input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search company or role..."
                                aria-label="Search applications"
                            />

                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                aria-label="Filter by status"
                            >
                                <option value="All">All statuses</option>
                                {STATUSES.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>

                        {filteredApplications.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">▤</div>
                                <strong>No applications found</strong>
                                <p>Try another search or add a new application.</p>
                            </div>
                        ) : (
                            <div className="table-scroll">
                                <table className="application-table">
                                    <thead>
                                    <tr>
                                        <th>COMPANY</th>
                                        <th>JOB ROLE</th>
                                        <th>STATUS</th>
                                        <th>APPLIED DATE</th>
                                        <th>JOB LINK</th>
                                        <th>ID</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredApplications.map((application) => (
                                        <tr key={application.id}>
                                            <td>
                                                <div className="company-cell">
                                  <span className="company-avatar">
                                    {String(application.company || '?').charAt(0).toUpperCase()}
                                  </span>
                                                    <strong>{application.company}</strong>
                                                </div>
                                            </td>
                                            <td>{application.role}</td>
                                            <td><StatusBadge status={application.status} /></td>
                                            <td>{application.appliedDate || '—'}</td>
                                            <td>
                                                {application.jobUrl ? (
                                                    <a
                                                        href={application.jobUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        View job ↗
                                                    </a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="muted-cell">#{application.id}</td>
                                            <td>
                                                <div className="action-group">
                                                    <button
                                                        className="table-action"
                                                        onClick={() => startEditing(application)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="table-action delete-action"
                                                        onClick={() => handleDeleteApplication(application.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                {page === 'ai' && (
                    <div className="ai-page">
                        <section className="panel ai-input-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Analyze your job match</h2>
                                    <p>Compare your skills with a job description using Gemini AI.</p>
                                </div>
                                <span className="ai-badge">✧ AI POWERED</span>
                            </div>

                            <form className="ai-form" onSubmit={handleAnalyze}>
                                <label htmlFor="skills">Your skills and experience</label>
                                <textarea
                                    id="skills"
                                    value={skills}
                                    onChange={(event) => setSkills(event.target.value)}
                                    placeholder="Example: Java, Spring Boot, REST APIs, SQL, PostgreSQL, Git..."
                                    rows={5}
                                    required
                                />

                                <label htmlFor="job-description">Job description</label>
                                <textarea
                                    id="job-description"
                                    value={jobDescription}
                                    onChange={(event) => setJobDescription(event.target.value)}
                                    placeholder="Paste the job description here..."
                                    rows={8}
                                    required
                                />

                                {aiError && (
                                    <div className="alert error-alert" role="alert">
                                        {aiError}
                                    </div>
                                )}

                                <button className="primary-button analyze-button" type="submit" disabled={aiLoading}>
                                    {aiLoading ? 'Analyzing your skills...' : '✧ Analyze job match'}
                                </button>
                            </form>
                        </section>

                        {aiAnalysis && (
                            <section className="panel ai-results-panel">
                                <div className="panel-heading">
                                    <div>
                                        <h2>Your match analysis</h2>
                                        <p>AI-generated guidance based on the information you provided.</p>
                                    </div>
                                    <span className="ai-badge">GEMINI</span>
                                </div>

                                <div className="match-score-area">
                                    <div className="score-ring" style={{
                                        '--score': `${matchScore ?? 0}%`,
                                    }}>
                                        <div className="score-ring-inner">
                                            <strong>{matchScore !== null ? `${matchScore}%` : '—'}</strong>
                                            <span>Match score</span>
                                        </div>
                                    </div>

                                    <div className="score-description">
                                        <h3>
                                            {matchScore === null
                                                ? 'Your analysis is ready'
                                                : matchScore >= 75
                                                    ? 'Strong potential match'
                                                    : matchScore >= 50
                                                        ? 'Some promising alignment'
                                                        : 'Focus on building key skills'}
                                        </h3>
                                        <p>
                                            This score is an AI estimate, not a guarantee of getting an interview.
                                            Review the recommendations below and verify them against the job requirements.
                                        </p>
                                    </div>
                                </div>

                                <div className="analysis-sections">
                                    {analysisSections.map((section, index) => (
                                        <article className="analysis-section" key={`${section.title}-${index}`}>
                                            <h3>{section.title}</h3>
                                            <ul>
                                                {section.items.map((item, itemIndex) => (
                                                    <li key={`${index}-${itemIndex}`}>{item}</li>
                                                ))}
                                            </ul>
                                        </article>
                                    ))}
                                </div>

                                <details className="raw-analysis">
                                    <summary>View complete AI response</summary>
                                    <div className="markdown-analysis">
                                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                                    </div>
                                </details>
                            </section>
                        )}

                        {!aiAnalysis && !aiLoading && (
                            <div className="ai-empty-hint">
                                <span>✧</span>
                                <div>
                                    <strong>Your next opportunity, better understood.</strong>
                                    <p>
                                        Enter your skills and a job description to see matching skills,
                                        improvement areas, and a preparation plan.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

function StatusBadge({ status }) {
    const normalized = STATUSES.find(
        (item) => safeLower(item) === safeLower(status)
    ) || 'Applied'

    return (
        <span className={`status-badge status-${normalized.toLowerCase()}`}>
        <i />
            {status || normalized}
      </span>
    )
}

export default App
