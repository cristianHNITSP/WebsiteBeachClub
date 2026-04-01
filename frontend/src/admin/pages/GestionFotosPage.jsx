import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionPanel from '../components/SectionPanel'
import { useToast } from '@/components/frida/Toast'

/* ── Internal: hover-aware photo card ── */
function PhotoCard({ photo, onMarkFavorite, onRemove }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        aspectRatio: '4/3',
        border: photo.favorite
          ? '2.5px solid var(--primary)'
          : '2px solid var(--outline-var)',
        transition: 'border-color 0.2s',
        cursor: 'default',
      }}
    >
      <img
        src={photo.url}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Favorite badge */}
      {photo.favorite && (
        <div style={{
          position: 'absolute', top: '6px', left: '6px',
          background: 'var(--primary)', borderRadius: 'var(--radius-full)',
          padding: '3px 8px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#fff' }}>star</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800, color: '#fff' }}>
            Principal
          </span>
        </div>
      )}

      {/* Action overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)',
        display: 'flex', alignItems: 'flex-end',
        padding: '8px',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.2s',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        {!photo.favorite && (
          <button
            onClick={() => onMarkFavorite(photo.id)}
            title="Marcar como principal"
            style={{
              width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>star</span>
          </button>
        )}
        <button
          onClick={() => onRemove(photo.id)}
          title="Eliminar foto"
          style={{
            width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'rgba(186,26,26,0.75)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff',
            marginLeft: 'auto',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(186,26,26,0.75)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
        </button>
      </div>
    </div>
  )
}

/* ── Section label ── */
function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color: 'var(--outline)', marginBottom: '14px',
      paddingBottom: '8px', borderBottom: '1px solid var(--outline-var)',
    }}>
      {children}
    </div>
  )
}

/* ── Main page ── */
export default function GestionFotosPage({ room, onBack, onDirtyChange }) {
  const addToast = useToast()
  const fileRef  = useRef()

  const [photos, setPhotos] = useState(() =>
    room?.img ? [{ id: 'initial-0', url: room.img, favorite: true }] : []
  )
  const [dragging, setDragging] = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { onDirtyChange?.(dirty) }, [dirty]) // eslint-disable-line

  /* ── Helpers ── */
  const markFavorite = (id) => {
    setPhotos(prev => prev.map(p => ({ ...p, favorite: p.id === id })))
    setDirty(true)
  }

  const removePhoto = (id) => {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== id)
      if (next.length > 0 && !next.some(p => p.favorite)) {
        next[0] = { ...next[0], favorite: true }
      }
      return next
    })
    setDirty(true)
  }

  const addFiles = (files) => {
    const newPhotos = Array.from(files).map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
      favorite: false,
    }))
    setPhotos(prev => {
      const merged = [...prev, ...newPhotos]
      if (!merged.some(p => p.favorite) && merged.length > 0) {
        merged[0] = { ...merged[0], favorite: true }
      }
      return merged
    })
    setDirty(true)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setDirty(false)
      onDirtyChange?.(false)
      addToast('Fotos actualizadas correctamente', { type: 'success', title: 'Guardado' })
      onBack()
    }, 1000)
  }

  const favoritePhoto    = photos.find(p => p.favorite)
  const secondaryPhotos  = photos.filter(p => !p.favorite)

  const actions = (
    <>
      <button className="btn-outline" onClick={onBack}>Cancelar</button>
      <button
        className="btn-primary"
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{ opacity: saving || !dirty ? 0.55 : 1 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </>
  )

  return (
    <SectionPanel
      eyebrow="Habitaciones"
      title={<>Gestionar<br /><em>Fotos</em></>}
      subtitle={`Administra las imágenes de "${room?.name}"`}
      onBack={onBack}
      dirty={dirty}
      actions={actions}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>

        {/* ── Left column: upload + grid ── */}
        <div>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--outline-var)'}`,
              background: dragging ? 'rgba(0,105,113,0.07)' : 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '44px',
                color: dragging ? 'var(--primary)' : 'var(--outline)',
                display: 'block', marginBottom: '14px',
                transition: 'color 0.2s',
              }}
            >
              cloud_upload
            </span>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '14px',
              fontWeight: 700, color: 'var(--on-surface)', marginBottom: '6px',
            }}>
              {dragging ? 'Suelta las fotos aquí' : 'Arrastra fotos aquí'}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)' }}>
              o haz clic para seleccionar · JPG, PNG, WEBP
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }}
            />
          </div>

          {/* Count */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            margin: '28px 0 14px',
          }}>
            <Label>
              {photos.length === 0
                ? 'Sin fotos'
                : `${photos.length} foto${photos.length !== 1 ? 's' : ''}`}
            </Label>
          </div>

          {/* Photo grid */}
          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <AnimatePresence mode="popLayout">
                {photos.map(photo => (
                  <motion.div
                    key={photo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PhotoCard
                      photo={photo}
                      onMarkFavorite={markFavorite}
                      onRemove={removePhoto}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px 24px',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              border: '1px dashed var(--outline-var)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--outline)', display: 'block', marginBottom: '10px' }}>
                photo_library
              </span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--outline)' }}>
                Aún no hay fotos. Sube la primera arriba.
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: preview ── */}
        <div>
          <Label>Vista previa</Label>

          {/* Hero preview (favorite photo) */}
          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            aspectRatio: '16/9',
            marginBottom: '16px',
            position: 'relative',
            background: 'var(--surface-container)',
          }}>
            <AnimatePresence mode="wait">
              {favoritePhoto ? (
                <motion.img
                  key={favoritePhoto.id}
                  src={favoritePhoto.url}
                  alt="Principal"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: '12px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)' }}>
                    image
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)' }}>
                    Sin foto principal
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {favoritePhoto && (
              <>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)',
                  pointerEvents: 'none',
                }} />
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: 'var(--primary)', borderRadius: 'var(--radius-full)',
                    padding: '3px 10px', marginBottom: '8px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#fff' }}>star</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>
                      Foto principal
                    </span>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: '#fff', fontWeight: 700,
                  }}>
                    {room?.name}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Secondary photos strip */}
          {secondaryPhotos.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'var(--outline)', marginBottom: '10px',
              }}>
                Fotos secundarias · {secondaryPhotos.length}
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {secondaryPhotos.map(p => (
                  <div
                    key={p.id}
                    style={{
                      flexShrink: 0, width: '72px', height: '54px',
                      borderRadius: 'var(--radius-md)', overflow: 'hidden',
                      border: '1.5px solid var(--outline-var)',
                    }}
                  >
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How it looks as a list card */}
          <div style={{
            fontFamily: 'var(--font-body)', fontSize: '9px', fontWeight: 800,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'var(--outline)', marginBottom: '12px',
            paddingBottom: '8px', borderBottom: '1px solid var(--outline-var)',
          }}>
            Vista en lista
          </div>
          <div style={{
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            border: '2px solid var(--outline-var)',
          }}>
            {/* Card image */}
            <div style={{ position: 'relative', height: '140px', overflow: 'hidden', background: 'var(--surface-container)' }}>
              {favoritePhoto ? (
                <img
                  src={favoritePhoto.url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--outline)' }}>image</span>
                </div>
              )}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(23,28,33,0.7), transparent)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '14px', right: '14px' }}>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>
                  {room?.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                    {room?.type}
                  </span>
                  <span className={`status-badge ${room?.status === 'active' ? 'status-badge--active' : 'status-badge--maintenance'}`}>
                    {room?.status === 'active' ? 'Activa' : 'Mant.'}
                  </span>
                </div>
              </div>
            </div>
            {/* Card footer */}
            <div style={{
              padding: '12px 16px',
              background: 'var(--surface-container-low)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                MXN ${room?.rate?.toLocaleString()} / noche
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--outline)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>photo_library</span>
                {photos.length} foto{photos.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Tip */}
          <div style={{
            marginTop: '20px',
            background: 'rgba(0,105,113,0.08)',
            border: '1px solid rgba(0,105,113,0.18)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)', flexShrink: 0, marginTop: '1px' }}>
              info
            </span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-var)', lineHeight: 1.6 }}>
              La foto marcada con <strong>★ Principal</strong> aparece en la tarjeta de la habitación y como imagen destacada. Pasa el cursor sobre cualquier foto en la galería para cambiarla.
            </p>
          </div>
        </div>
      </div>
    </SectionPanel>
  )
}
