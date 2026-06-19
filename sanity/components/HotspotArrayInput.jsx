'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {PatchEvent, set, unset, useClient, useFormValue} from 'sanity'

const API_VERSION = '2024-08-01'
const MIN_SIZE = 0.025

const ACTIONS = [
  {label: 'Next screen', value: 'next'},
  {label: 'Go to screen', value: 'goToScreen'},
  {label: 'Back', value: 'back'},
  {label: 'Complete task', value: 'completeTask'},
]

function createKey() {
  return Math.random().toString(36).slice(2, 12)
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function round(value) {
  return Number(clamp(value).toFixed(4))
}

function normalizeRect(rect) {
  const x = round(rect.x)
  const y = round(rect.y)
  const w = round(clamp(rect.w, MIN_SIZE, 1 - x))
  const h = round(clamp(rect.h, MIN_SIZE, 1 - y))
  return {x, y, w, h}
}

function getPointerPosition(event, element) {
  const bounds = element.getBoundingClientRect()
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  }
}

function assetRefFromImage(image) {
  return image?.asset?._ref || image?.asset?._id || null
}

function makeHotspot(index, rect) {
  const key = createKey()
  return {
    _key: key,
    _type: 'studyHotspot',
    hotspotId: key,
    label: `Hotspot ${index + 1}`,
    ...normalizeRect(rect),
    action: 'next',
    isCorrect: true,
  }
}

function getScreenOptionLabel({screen, index, screenAssets, currentScreenKey}) {
  const assetRef = assetRefFromImage(screen?.image)
  const fileName = assetRef ? screenAssets?.[assetRef]?.originalFilename : null
  const baseTitle = screen?.title || fileName || screen?.alt || `Screen ${index + 1}`
  const fileSuffix = screen?.title && fileName ? ` · ${fileName}` : ''
  const currentSuffix = screen?._key && screen._key === currentScreenKey ? ' (current)' : ''
  return `${index + 1}. ${baseTitle}${fileSuffix}${currentSuffix}`
}

export default function HotspotArrayInput(props) {
  const {value = [], onChange, path} = props
  const client = useClient({apiVersion: API_VERSION})
  const imagePath = useMemo(() => [...(path || []).slice(0, -1), 'image'], [path])
  const screenPath = useMemo(() => [...(path || []).slice(0, -1)], [path])
  const screensPath = useMemo(() => [...(path || []).slice(0, -2)], [path])
  const image = useFormValue(imagePath)
  const currentScreen = useFormValue(screenPath)
  const screensValue = useFormValue(screensPath)
  const screens = Array.isArray(screensValue) ? screensValue : []
  const assetRef = assetRefFromImage(image)
  const currentScreenKey = currentScreen?._key || null

  const imageWrapRef = useRef(null)
  const dragRef = useRef(null)
  const [asset, setAsset] = useState(null)
  const [screenAssets, setScreenAssets] = useState({})
  const [selectedKey, setSelectedKey] = useState(value?.[0]?._key || null)
  const [draftRect, setDraftRect] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const screenAssetRefs = useMemo(
    () => Array.from(new Set(screens.map((screen) => assetRefFromImage(screen?.image)).filter(Boolean))),
    [screens]
  )
  const screenAssetRefsKey = screenAssetRefs.join('|')

  useEffect(() => {
    let ignore = false

    async function fetchAsset() {
      if (!assetRef) {
        setAsset(null)
        return
      }

      const nextAsset = await client.fetch(
        `*[_id == $assetRef][0]{url, originalFilename, metadata{dimensions{width,height,aspectRatio}}}`,
        {assetRef}
      )

      if (!ignore) setAsset(nextAsset || null)
    }

    fetchAsset().catch(() => {
      if (!ignore) setAsset(null)
    })

    return () => {
      ignore = true
    }
  }, [assetRef, client])

  useEffect(() => {
    let ignore = false

    async function fetchScreenAssets() {
      if (!screenAssetRefs.length) {
        setScreenAssets({})
        return
      }

      const assets = await client.fetch(
        `*[_id in $assetRefs]{_id, url, originalFilename, metadata{dimensions{width,height,aspectRatio}}}`,
        {assetRefs: screenAssetRefs}
      )

      const assetMap = Object.fromEntries((assets || []).map((item) => [item._id, item]))
      if (!ignore) setScreenAssets(assetMap)
    }

    fetchScreenAssets().catch(() => {
      if (!ignore) setScreenAssets({})
    })

    return () => {
      ignore = true
    }
  }, [client, screenAssetRefsKey])

  useEffect(() => {
    if (!selectedKey && value?.length) setSelectedKey(value[0]._key)
    if (selectedKey && value?.length && !value.some((item) => item._key === selectedKey)) {
      setSelectedKey(value[0]._key)
    }
  }, [selectedKey, value])

  const screenOptions = useMemo(
    () =>
      screens
        .map((screen, index) => {
          const targetValue = screen?.screenId || screen?._key
          if (!targetValue) return null

          return {
            value: targetValue,
            label: getScreenOptionLabel({screen, index, screenAssets, currentScreenKey}),
          }
        })
        .filter(Boolean),
    [screens, screenAssets, currentScreenKey]
  )

  function commit(nextValue) {
    onChange(PatchEvent.from(nextValue?.length ? set(nextValue) : unset()))
  }

  function updateHotspot(key, patch) {
    const nextValue = value.map((item) =>
      item._key === key
        ? {
            ...item,
            ...patch,
            ...(patch.x !== undefined || patch.y !== undefined || patch.w !== undefined || patch.h !== undefined
              ? normalizeRect({...item, ...patch})
              : {}),
          }
        : item
    )
    commit(nextValue)
  }

  function deleteHotspot(key) {
    const nextValue = value.filter((item) => item._key !== key)
    commit(nextValue)
    setSelectedKey(nextValue[0]?._key || null)
  }

  function addDefaultHotspot() {
    const nextHotspot = makeHotspot(value.length, {x: 0.1, y: 0.1, w: 0.32, h: 0.14})
    commit([...value, nextHotspot])
    setSelectedKey(nextHotspot._key)
  }

  function startDraw(event) {
    if (!isDrawing || !imageWrapRef.current) return
    event.preventDefault()
    const start = getPointerPosition(event, imageWrapRef.current)
    dragRef.current = {type: 'draw', start}
    setDraftRect({x: start.x, y: start.y, w: 0, h: 0})
  }

  function startMove(event, hotspot) {
    if (!imageWrapRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedKey(hotspot._key)
    dragRef.current = {
      type: 'move',
      key: hotspot._key,
      start: getPointerPosition(event, imageWrapRef.current),
      rect: {
        x: Number(hotspot.x) || 0,
        y: Number(hotspot.y) || 0,
        w: Number(hotspot.w) || 0.1,
        h: Number(hotspot.h) || 0.1,
      },
    }
  }

  function startResize(event, hotspot) {
    if (!imageWrapRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedKey(hotspot._key)
    dragRef.current = {
      type: 'resize',
      key: hotspot._key,
      start: getPointerPosition(event, imageWrapRef.current),
      rect: {
        x: Number(hotspot.x) || 0,
        y: Number(hotspot.y) || 0,
        w: Number(hotspot.w) || 0.1,
        h: Number(hotspot.h) || 0.1,
      },
    }
  }

  useEffect(() => {
    function handleMove(event) {
      const drag = dragRef.current
      const element = imageWrapRef.current
      if (!drag || !element) return

      const point = getPointerPosition(event, element)

      if (drag.type === 'draw') {
        const x = Math.min(drag.start.x, point.x)
        const y = Math.min(drag.start.y, point.y)
        const w = Math.abs(point.x - drag.start.x)
        const h = Math.abs(point.y - drag.start.y)
        setDraftRect(normalizeRect({x, y, w, h}))
        return
      }

      const dx = point.x - drag.start.x
      const dy = point.y - drag.start.y

      if (drag.type === 'move') {
        updateHotspot(drag.key, {
          x: clamp(drag.rect.x + dx, 0, 1 - drag.rect.w),
          y: clamp(drag.rect.y + dy, 0, 1 - drag.rect.h),
        })
        return
      }

      if (drag.type === 'resize') {
        updateHotspot(drag.key, {
          w: clamp(drag.rect.w + dx, MIN_SIZE, 1 - drag.rect.x),
          h: clamp(drag.rect.h + dy, MIN_SIZE, 1 - drag.rect.y),
        })
      }
    }

    function handleUp() {
      const drag = dragRef.current
      if (drag?.type === 'draw' && draftRect) {
        const rect = normalizeRect(draftRect)
        if (rect.w >= MIN_SIZE && rect.h >= MIN_SIZE) {
          const nextHotspot = makeHotspot(value.length, rect)
          commit([...value, nextHotspot])
          setSelectedKey(nextHotspot._key)
        }
      }

      dragRef.current = null
      setDraftRect(null)
      setIsDrawing(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [draftRect, value])

  const selectedHotspot = value.find((item) => item._key === selectedKey) || value[0] || null
  const targetIsKnown = selectedHotspot?.targetScreenId
    ? screenOptions.some((option) => option.value === selectedHotspot.targetScreenId)
    : true

  return (
    <div style={{display: 'grid', gap: 16}}>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
        <button type="button" onClick={addDefaultHotspot} style={buttonStyle}>
          Add hotspot
        </button>
        <button
          type="button"
          onClick={() => setIsDrawing((current) => !current)}
          style={{...buttonStyle, background: isDrawing ? '#111' : '#fff', color: isDrawing ? '#fff' : '#111'}}
        >
          {isDrawing ? 'Click-drag on image…' : 'Draw hotspot'}
        </button>
        <span style={{fontSize: 12, color: '#666'}}>
          Drag the rectangle to move it. Use the corner handle to resize. Values are saved responsively, not as pixels.
        </span>
      </div>

      {!asset?.url ? (
        <div style={emptyStyle}>Upload a PNG image above first, then draw hotspots here.</div>
      ) : (
        <div style={{display: 'grid', gap: 12}}>
          <div
            ref={imageWrapRef}
            onPointerDown={startDraw}
            style={{
              position: 'relative',
              width: 'min(100%, 520px)',
              border: '1px solid #d8d8d8',
              background: '#fff',
              cursor: isDrawing ? 'crosshair' : 'default',
              userSelect: 'none',
            }}
          >
            <img
              src={asset.url}
              alt="Screen preview"
              draggable="false"
              style={{display: 'block', width: '100%', height: 'auto', pointerEvents: 'none'}}
            />

            {value.map((hotspot, index) => {
              const x = Number(hotspot.x) || 0
              const y = Number(hotspot.y) || 0
              const w = Number(hotspot.w) || 0.1
              const h = Number(hotspot.h) || 0.1
              const selected = hotspot._key === selectedHotspot?._key

              return (
                <div
                  key={hotspot._key}
                  onPointerDown={(event) => startMove(event, hotspot)}
                  title={hotspot.label || `Hotspot ${index + 1}`}
                  style={{
                    position: 'absolute',
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${w * 100}%`,
                    height: `${h * 100}%`,
                    boxSizing: 'border-box',
                    border: selected ? '2px solid #111' : '2px solid rgba(17,17,17,.55)',
                    background: selected ? 'rgba(17,17,17,.13)' : 'rgba(17,17,17,.07)',
                    cursor: 'move',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      transform: 'translateY(-100%)',
                      background: '#111',
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: 1,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {index + 1}. {hotspot.label || hotspot.action || 'Hotspot'}
                  </div>
                  <div
                    onPointerDown={(event) => startResize(event, hotspot)}
                    style={{
                      position: 'absolute',
                      right: -6,
                      bottom: -6,
                      width: 12,
                      height: 12,
                      background: '#111',
                      border: '2px solid #fff',
                      cursor: 'nwse-resize',
                    }}
                  />
                </div>
              )
            })}

            {draftRect ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${draftRect.x * 100}%`,
                  top: `${draftRect.y * 100}%`,
                  width: `${draftRect.w * 100}%`,
                  height: `${draftRect.h * 100}%`,
                  boxSizing: 'border-box',
                  border: '2px dashed #111',
                  background: 'rgba(17,17,17,.08)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>

          {selectedHotspot ? (
            <div style={editorStyle}>
              <div style={{fontWeight: 700}}>Selected hotspot</div>
              <label style={labelStyle}>
                Label
                <input
                  type="text"
                  value={selectedHotspot.label || ''}
                  onChange={(event) => updateHotspot(selectedHotspot._key, {label: event.target.value})}
                  placeholder="e.g. Continue button"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Action
                <select
                  value={selectedHotspot.action || 'next'}
                  onChange={(event) => {
                    const nextAction = event.target.value
                    updateHotspot(selectedHotspot._key, {
                      action: nextAction,
                      ...(nextAction !== 'goToScreen' ? {targetScreenId: ''} : {}),
                    })
                  }}
                  style={inputStyle}
                >
                  {ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </label>
              {selectedHotspot.action === 'goToScreen' ? (
                <label style={labelStyle}>
                  Target screen
                  <select
                    value={selectedHotspot.targetScreenId || ''}
                    onChange={(event) => updateHotspot(selectedHotspot._key, {targetScreenId: event.target.value})}
                    style={inputStyle}
                  >
                    <option value="">Select a screen…</option>
                    {!targetIsKnown ? (
                      <option value={selectedHotspot.targetScreenId}>
                        Unknown saved target ({selectedHotspot.targetScreenId})
                      </option>
                    ) : null}
                    {screenOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span style={{fontSize: 12, color: '#666'}}>
                    Pick by screen title or uploaded filename. The internal screen key is saved automatically.
                  </span>
                </label>
              ) : null}
              <label style={{display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13}}>
                <input
                  type="checkbox"
                  checked={selectedHotspot.isCorrect !== false}
                  onChange={(event) => updateHotspot(selectedHotspot._key, {isCorrect: event.target.checked})}
                />
                Counts as correct click
              </label>
              <button type="button" onClick={() => deleteHotspot(selectedHotspot._key)} style={{...buttonStyle, borderColor: '#c00', color: '#c00'}}>
                Delete selected hotspot
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

const buttonStyle = {
  appearance: 'none',
  border: '1px solid #111',
  background: '#fff',
  color: '#111',
  padding: '8px 10px',
  font: 'inherit',
  cursor: 'pointer',
}

const emptyStyle = {
  border: '1px dashed #ccc',
  padding: 16,
  color: '#666',
  fontSize: 13,
}

const editorStyle = {
  display: 'grid',
  gap: 10,
  maxWidth: 520,
  padding: 12,
  border: '1px solid #e5e5e5',
  background: '#fafafa',
}

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 13,
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 8,
  border: '1px solid #ccc',
  font: 'inherit',
}
