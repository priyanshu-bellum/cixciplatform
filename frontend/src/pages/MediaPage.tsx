import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image, Upload, Plus, X, AlertCircle, Globe, Lock } from 'lucide-react'
import api from '../lib/apiClient'

const ASSET_STATUS: Record<string, string> = {
  upload_pending: 'badge-muted', uploading: 'badge-blue', validating: 'badge-blue',
  validation_failed: 'badge-red', processing: 'badge-amber', processing_failed: 'badge-red',
  ready: 'badge-green', restricted: 'badge-amber', revoked: 'badge-red',
  expired: 'badge-muted', superseded: 'badge-muted',
}

const ASSET_TYPE_BADGE: Record<string, string> = {
  product_image: 'badge-blue', device_image: 'badge-purple', brand_logo: 'badge-amber',
  document: 'badge-muted', video: 'badge-muted', other: 'badge-muted',
}

const SESSION_STATUS: Record<string, string> = {
  initiated: 'badge-muted', uploading: 'badge-blue', completed: 'badge-green',
  failed: 'badge-red', expired: 'badge-muted',
}

function fmtBytes(b: number | null | undefined) {
  if (b == null) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage() {
  const [tab, setTab] = useState<'assets' | 'sessions'>('assets')
  const [showModal, setShowModal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [assetType, setAssetType] = useState('product_image')
  const [ownerModule, setOwnerModule] = useState('catalog')
  const [isPublic, setIsPublic] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { data: assetData, isLoading: aLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['media-assets'],
    queryFn: () => api.get('/media/assets/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: sessionData, isLoading: sLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['upload-sessions'],
    queryFn: () =>
      api.get('/media/upload-sessions/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'sessions',
  })

  const assets = assetData?.results ?? (Array.isArray(assetData) ? assetData : [])
  const sessions = sessionData?.results ?? (Array.isArray(sessionData) ? sessionData : [])

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(15)

    try {
      // 1. Request presigned upload URL from NPS/Media API
      const reqRes = await api.post('/media/assets/request_upload/', {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        asset_type: assetType,
        owner_module: ownerModule,
        is_public: isPublic,
      })

      const { presigned_url, asset: assetId } = reqRes.data
      setProgress(40)

      // 2. Perform direct binary upload to GCS/S3 presigned PUT URL
      const uploadRes = await fetch(presigned_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Direct upload failed with status ${uploadRes.status}`)
      }

      setProgress(85)

      // 3. Inform backend the asset is ready for consumption
      await api.patch(`/media/assets/${assetId}/`, {
        status: 'ready',
        file_size_bytes: file.size,
      })

      setProgress(100)
      setTimeout(() => {
        setUploading(false)
        setShowModal(false)
        setFile(null)
        refetchAssets()
        if (tab === 'sessions') {
          refetchSessions()
        }
      }, 500)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'An error occurred during upload.')
      setUploading(false)
    }
  }

  return (
    <div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 6, 10, 0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }
        .modal-content {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius);
          width: 520px;
          max-width: 90%;
          padding: 26px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          animation: modalEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dropzone {
          border: 2px dashed var(--border);
          border-radius: var(--radius);
          padding: 30px;
          text-align: center;
          background: var(--bg-base);
          cursor: pointer;
          transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .dropzone:hover {
          border-color: var(--accent);
          background: var(--accent-dim);
        }
        .progress-bar {
          height: 6px;
          background: var(--border);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 16px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--purple));
          transition: width 0.3s ease;
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Media Assets</div>
          <div className="page-sub">Images, documents, renditions, and upload sessions</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={14} /> Upload Asset
        </button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'assets' ? 'active' : ''}`} onClick={() => setTab('assets')}>
          Assets
        </div>
        <div className={`tab ${tab === 'sessions' ? 'active' : ''}`} onClick={() => setTab('sessions')}>
          Upload Sessions
        </div>
      </div>

      {tab === 'assets' && (
        <div className="table-wrap">
          {aLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : assets.length === 0 ? (
            <div className="empty-state">
              <Image size={40} />
              <div>No media assets</div>
              <div style={{ fontSize: 12 }}>
                Upload product images, device images, and documents. Storage paths are references — not identifiers.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Filename</th><th>Type</th><th>Status</th>
                  <th>Size</th><th>Owner Module</th><th>Access</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.original_filename}
                    </td>
                    <td>
                      <span className={`badge ${ASSET_TYPE_BADGE[a.asset_type] ?? 'badge-muted'}`}>
                        {a.asset_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${ASSET_STATUS[a.status] ?? 'badge-muted'}`}>
                        {a.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{fmtBytes(a.file_size_bytes)}</td>
                    <td><span className="badge badge-muted">{a.owner_module ?? '—'}</span></td>
                    <td>
                      {a.is_public ? (
                        <span className="badge badge-green" style={{ gap: '4px' }}><Globe size={10} /> Public</span>
                      ) : (
                        <span className="badge badge-muted" style={{ gap: '4px' }}><Lock size={10} /> Private</span>
                      )}
                    </td>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="table-wrap">
          {sLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <Upload size={40} />
              <div>No upload sessions</div>
              <div style={{ fontSize: 12 }}>
                Upload sessions track presigned GCS/S3 uploads. Sessions expire if unused.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Expected Filename</th><th>MIME Type</th><th>Status</th>
                  <th>Expires At</th><th>Completed At</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.expected_filename}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{s.expected_mime_type}</td>
                    <td>
                      <span className={`badge ${SESSION_STATUS[s.status] ?? 'badge-muted'}`}>{s.status}</span>
                    </td>
                    <td style={{ color: new Date(s.expires_at) < new Date() ? 'var(--red)' : 'var(--text-secondary)' }}>
                      {s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                    </td>
                    <td>{s.completed_at ? new Date(s.completed_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Upload Asset Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Upload Media Asset</h3>
              <button
                className="btn btn-ghost"
                style={{ padding: 4 }}
                onClick={() => {
                  if (!uploading) {
                    setShowModal(false)
                    setFile(null)
                    setError(null)
                  }
                }}
                disabled={uploading}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label className="label">Select File</label>
                <input
                  type="file"
                  id="file-input"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
                <div
                  className="dropzone"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload size={28} style={{ color: file ? 'var(--accent)' : 'var(--text-muted)' }} />
                  {file ? (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtBytes(file.size)}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 500 }}>Click to browse or drag file here</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Any image, document, or media asset</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-grid card-grid-2" style={{ marginBottom: 18 }}>
                <div className="form-group">
                  <label className="label">Asset Type</label>
                  <select
                    className="input"
                    value={assetType}
                    onChange={e => setAssetType(e.target.value)}
                    disabled={uploading}
                  >
                    <option value="product_image">Product Image</option>
                    <option value="device_image">Device Image</option>
                    <option value="brand_logo">Brand Logo</option>
                    <option value="document">Document</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Owner Module</label>
                  <input
                    type="text"
                    className="input"
                    value={ownerModule}
                    onChange={e => setOwnerModule(e.target.value)}
                    placeholder="e.g., catalog"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  disabled={uploading}
                  style={{ width: 15, height: 15 }}
                />
                <label htmlFor="is-public" style={{ fontSize: 13, userSelect: 'none', cursor: 'pointer' }}>
                  Make this asset publicly readable
                </label>
              </div>

              {uploading && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false)
                    setFile(null)
                    setError(null)
                  }}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!file || uploading}
                >
                  {uploading ? 'Uploading...' : 'Start Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

