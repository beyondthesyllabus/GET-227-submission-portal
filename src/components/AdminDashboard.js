'use client'

import { useState, useEffect, useCallback } from 'react'

const DEPARTMENTS = ['Mechanical', 'Civil', 'Electrical/Electronic', 'Chemical', 'Computer', 'Petroleum', 'Agricultural', 'Other']

export default function AdminDashboard({ token, onLogout }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [activeTab, setActiveTab] = useState('submissions') // 'submissions' | 'students' | 'timeline'

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/submissions', {
        headers: { 'x-admin-password': token },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSubmissions(data.reverse())
    } catch {
      setError('Failed to load submissions. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  const handleDownload = async (submission) => {
    setDownloading(submission.referenceCode)
    try {
      const res = await fetch(`/api/submissions/${submission.referenceCode}/download`, {
        headers: { 'x-admin-password': token },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = submission.originalFileName || 'project-file'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('File download failed. The file may not be available on the server.')
    } finally {
      setDownloading(null)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'x-admin-password': token },
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      alert('File uploaded successfully! URL: ' + data.url)
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      setUploadFile(null)
    }
  }
    sessionStorage.removeItem('admin_token')
    onLogout()
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const filtered = submissions.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      s.groupName?.toLowerCase().includes(q) ||
      s.referenceCode?.toLowerCase().includes(q) ||
      s.projectTitle?.toLowerCase().includes(q) ||
      (s.members || []).some(m => m.toLowerCase().includes(q))
    const matchDept = !filterDept || s.department === filterDept
    return matchSearch && matchDept
  })

  // Build flat students list across all submissions
  const allStudents = submissions.flatMap(s =>
    (s.members || []).map((reg, i) => ({
      memberNum: i + 1,
      regNumber: reg,
      groupName: s.groupName,
      department: s.department,
      level: s.level,
      referenceCode: s.referenceCode,
      submittedAt: s.submittedAt,
    }))
  )

  const filteredStudents = allStudents.filter(st => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      st.regNumber?.toLowerCase().includes(q) ||
      st.groupName?.toLowerCase().includes(q) ||
      st.referenceCode?.toLowerCase().includes(q)
    const matchDept = !filterDept || st.department === filterDept
    return matchSearch && matchDept
  })

  // Stats
  const totalCount = submissions.length
  const deptCounts = DEPARTMENTS.reduce((acc, d) => {
    acc[d] = submissions.filter(s => s.department === d).length
    return acc
  }, {})
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0)

  // Timeline — group by date
  const timeline = submissions.reduce((acc, s) => {
    const dateKey = s.submittedAt
      ? new Date(s.submittedAt).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : 'Unknown Date'
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(s)
    return acc
  }, {})

  return (
    <div className="admin-dashboard">

      {/* Top Bar */}
      <div className="admin-top-bar">
        <div>
          <h2 className="admin-dashboard-title">📋 Admin Dashboard</h2>
          <p className="admin-dashboard-subtitle">GET227-Solid Works Modelling and Graphics II Assignment portal Submission</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--label-color)' }}>Signed in as <strong>MechanicalHOD</strong></span>
          <button onClick={fetchSubmissions} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>↻ Refresh</button>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sign Out</button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{totalCount}</div>
          <div className="admin-stat-label">Total Group Submissions</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{totalCount * 5}</div>
          <div className="admin-stat-label">Total Students</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{Object.values(deptCounts).filter(v => v > 0).length}</div>
          <div className="admin-stat-label">Active Departments</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{topDept ? topDept[0].split('/')[0] : '—'}</div>
          <div className="admin-stat-label">Top Department</div>
        </div>
      </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="admin-upload-form" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="file" accept=".zip,.tar,.rar" onChange={e => setUploadFile(e.target.files[0])} />
          <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile} style={{ padding: '0.5rem 1rem' }}>
            {uploading ? 'Uploading...' : 'Upload Folder'}
          </button>
        </form>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>
          🗂 Group Submissions ({totalCount})
        </button>
        <button className={`admin-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
          🕐 Submission Timeline
        </button>
        <button className={`admin-tab ${activeTab === 'regsearch' ? 'active' : ''}`} onClick={() => setActiveTab('regsearch')}>
          🔎 RegNumber Search
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <input
          type="text"
          className="form-control"
          placeholder={activeTab === 'regsearch' ? 'Search by registration number...' : 'Search by group name, reference, project title...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="form-control"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          style={{ maxWidth: '220px' }}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="admin-loading">⏳ Loading submissions...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <>
          {/* =================== SUBMISSIONS TAB =================== */}
          {activeTab === 'submissions' && (
            filtered.length === 0 ? (
              <div className="admin-empty">No submissions found matching your search.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Reference Code</th>
                      <th>Group Name</th>
                      <th>Department</th>
                      <th>Level</th>
                      <th>Project Title</th>
                      <th>Submitted At</th>
                      <th>File</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, idx) => (
                      <tr key={s.referenceCode}>
                        <td style={{ color: 'var(--label-color)', fontWeight: 600 }}>{idx + 1}</td>
                        <td><span className="ref-badge">{s.referenceCode}</span></td>
                        <td style={{ fontWeight: 600 }}>{s.groupName}</td>
                        <td>{s.department}</td>
                        <td>{s.level}</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.projectTitle}>{s.projectTitle}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{formatDate(s.submittedAt)}</td>
                        <td>
                          {s.fileName
                            ? <span style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '0.82rem' }}>✓ Uploaded</span>
                            : <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>None</span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                              onClick={() => setSelectedSubmission(s)}
                            >
                              View
                            </button>
                            {s.fileName && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                                onClick={() => handleDownload(s)}
                                disabled={downloading === s.referenceCode}
                              >
                                {downloading === s.referenceCode ? '...' : '⬇ Download'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* =================== REG SEARCH TAB =================== */}
          {activeTab === 'regsearch' && (
            filteredStudents.length === 0 ? (
              <div className="admin-empty">No registration numbers match your search.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Registration Number</th>
                      <th>Member No.</th>
                      <th>Group Name</th>
                      <th>Department</th>
                      <th>Level</th>
                      <th>Reference Code</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st, idx) => (
                      <tr key={`${st.referenceCode}-${st.memberNum}`}>
                        <td style={{ color: 'var(--label-color)', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-red)' }}>
                            {st.regNumber || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="ref-badge" style={{ background: '#f0fdf4', color: 'var(--success-color)' }}>
                            Member {st.memberNum}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{st.groupName}</td>
                        <td>{st.department}</td>
                        <td>{st.level}</td>
                        <td><span className="ref-badge">{st.referenceCode}</span></td>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDate(st.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}


          {/* =================== TIMELINE TAB =================== */}
          {activeTab === 'timeline' && (
            Object.keys(timeline).length === 0 ? (
              <div className="admin-empty">No submissions yet.</div>
            ) : (
              <div className="admin-timeline">
                {Object.entries(timeline).map(([date, subs]) => (
                  <div key={date} className="timeline-group">
                    <div className="timeline-date-header">
                      <span className="timeline-date-dot"></span>
                      <span className="timeline-date-label">{date}</span>
                      <span className="timeline-date-count">{subs.length} submission{subs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="timeline-cards">
                      {subs.map(s => (
                        <div key={s.referenceCode} className="timeline-card">
                          <div className="timeline-card-header">
                            <div>
                              <span className="ref-badge">{s.referenceCode}</span>
                              <span style={{ marginLeft: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>{s.groupName}</span>
                            </div>
                            <span className="timeline-time">
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </span>
                          </div>
                          <div className="timeline-card-meta">
                            <span>📚 {s.department} — Level {s.level}</span>
                            <span>📁 {s.projectTitle}</span>
                          </div>
                          <div className="timeline-card-members">
                            <strong>Members:</strong>
                            <div className="timeline-reg-list">
                              {(s.members || []).map((reg, i) => (
                                <span key={i} className="timeline-reg-badge">
                                  M{i + 1}: {reg || '—'}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="timeline-card-actions">
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }} onClick={() => setSelectedSubmission(s)}>
                              Full Details
                            </button>
                            {s.fileName && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }}
                                onClick={() => handleDownload(s)}
                                disabled={downloading === s.referenceCode}
                              >
                                {downloading === s.referenceCode ? 'Downloading...' : '⬇ Download Project'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        
      )}

      {/* =================== DETAIL MODAL =================== */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submission Details</h3>
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-ref">{selectedSubmission.referenceCode}</div>

              <div className="modal-grid">
                <div className="modal-field">
                  <span className="modal-field-label">Group Name</span>
                  <span className="modal-field-value">{selectedSubmission.groupName}</span>
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Department</span>
                  <span className="modal-field-value">{selectedSubmission.department}</span>
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Level</span>
                  <span className="modal-field-value">{selectedSubmission.level}</span>
                </div>
                <div className="modal-field">
                  <span className="modal-field-label">Submitted At</span>
                  <span className="modal-field-value">{formatDate(selectedSubmission.submittedAt)}</span>
                </div>
              </div>

              <div className="modal-field" style={{ marginBottom: '1.5rem' }}>
                <span className="modal-field-label">Project Title</span>
                <span className="modal-field-value">{selectedSubmission.projectTitle}</span>
              </div>

              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                👤 Group Members — Registration Numbers
              </h4>
              <div className="member-list">
                {(selectedSubmission.members || []).map((reg, i) => (
                  <div key={i} className="member-item">
                    <span className="member-num">Member {i + 1}</span>
                    <span className="member-reg">{reg || '—'}</span>
                  </div>
                ))}
              </div>

              {selectedSubmission.fileName ? (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    📁 Project File
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 1, color: 'var(--label-color)', fontSize: '0.9rem' }}>📎 {selectedSubmission.originalFileName}</span>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}
                      onClick={() => handleDownload(selectedSubmission)}
                      disabled={downloading === selectedSubmission.referenceCode}
                    >
                      {downloading === selectedSubmission.referenceCode ? 'Downloading...' : '⬇ Download for Assessment'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#fef9f0', border: '1px solid #fde68a', borderRadius: '6px', color: '#b45309', fontSize: '0.9rem' }}>
                  ⚠ No project file was uploaded with this submission.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
