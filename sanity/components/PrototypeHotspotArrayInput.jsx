'use client'

import {useEffect, useMemo, useRef, useState} from 'react'
import {PatchEvent, set, unset, useClient, useFormValue} from 'sanity'

const API_VERSION = '2024-08-01'
const MIN_SIZE = 2.5

function createKey() {
  return Math.random().toString(36).slice(2, 12)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value) {
  return Number(Number(value).toFixed(2))
}

function normalizeRect(rect) {
  const x = round(clamp(Number(rect.x) || 0, 0, 100 - MIN_SIZE))
  const y = round(clamp(Number(rect.y) || 0, 0, 100 - MIN_SIZE))
  const width = round(clamp(Number(rect.width) || MIN_SIZE, MIN_SIZE, 100 - x))
  const height = round(clamp(Number(rect.height) || MIN_SIZE, MIN_SIZE, 100 - y))
  return {x, y, width, height}
}

function pointerPosition(event, element) {
  const bounds = element.getBoundingClientRect()
  return {
    x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
    y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
  }
}

function assetRefFromImage(image) {
  return image?.asset?._ref || image?.asset?._id || null
}

function destinationValue(step) {
  return step?.stepKey || step?._key || ''
}

function makeHotspot(index, rect, nextKey) {
  return {
    _key: createKey(),
    _type: 'prototypeHotspot',
    label: `Hotspot ${index + 1}`,
    nextKey: nextKey || '',
    ...normalizeRect(rect),
  }
}

export default function PrototypeHotspotArrayInput(props) {
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

  const imageWrapRef = useRef(null)
  const dragRef = useRef(null)
  const valueRef = useRef(value)
  const [asset, setAsset] = useState(null)
  const [selectedKey, setSelectedKey] = useState(value?.[0]?._key || null)
  const [draftRect, setDraftRect] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    let ignore = false

    async function fetchAsset() {
      if (!assetRef) {
        setAsset(null)
        return
      }

      const nextAsset = await client.fetch(
        `*[_id == $assetRef][0]{url, originalFilename, metadata{dimensions{width,height,aspectRatio}}}`,
        {assetRef},
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
    if (!selectedKey && value?.length) setSelectedKey(value[0]._key)
    if (selectedKey && value?.length && !value.some((item) => item._key === selectedKey)) {
      setSelectedKey(value[0]._key)
    }
    if (!value?.length && selectedKey) setSelectedKey(null)
  }, [selectedKey, value])

  const currentScreenValue = destinationValue(currentScreen)
  const currentScreenIndex = screens.findIndex((screen) => (
    (currentScreen?._key && screen?._key === currentScreen._key) ||
    (currentScreen?.stepKey && screen?.stepKey === currentScreen.stepKey)
  ))

  const screenOptions = useMemo(
    () => screens.map((screen, index) => {
      const optionValue = destinationValue(screen)
      if (!optionValue) return null
      const isCurrent = (
        (currentScreen?._key && screen?._key === currentScreen._key) ||
        (currentScreen?.stepKey && screen?.stepKey === currentScreen.stepKey)
      )
      return {
        value: optionValue,
        label: `${index + 1}. ${screen?.label || screen?.stepKey || `Screen ${index + 1}`}${isCurrent ? ' (current)' : ''}`,
      }
    }).filter(Boolean),
    [currentScreen?._key, currentScreen?.stepKey, screens],
  )

  const defaultDestination = (
    destinationValue(screens[currentScreenIndex + 1]) ||
    screenOptions.find((option) => option.value !== currentScreenValue)?.value ||
    ''
  )

  function commit(nextValue) {
    valueRef.current = nextValue
    onChange(PatchEvent.from(nextValue?.length ? set(nextValue) : unset()))
  }

  function updateHotspot(key, patch) {
    const currentValue = Array.isArray(valueRef.current) ? valueRef.current : []
    const nextValue = currentValue.map((item) => {
      if (item._key !== key) return item
      const merged = {...item, ...patch}
      const changesRect = ['x', 'y', 'width', 'height'].some((field) => patch[field] !== undefined)
      return changesRect ? {...merged, ...normalizeRect(merged)} : merged
    })
    commit(nextValue)
  }

  function deleteHotspot(key) {
    const currentValue = Array.isArray(valueRef.current) ? valueRef.current : []
    const nextValue = currentValue.filter((item) => item._key !== key)
    commit(nextValue)
    setSelectedKey(nextValue[0]?._key || null)
  }

  function addDefaultHotspot() {
    const currentValue = Array.isArray(valueRef.current) ? valueRef.current : []
    const nextHotspot = makeHotspot(
      currentValue.length,
      {x: 10, y: 10, width: 35, height: 12},
      defaultDestination,
    )
    commit([...currentValue, nextHotspot])
    setSelectedKey(nextHotspot._key)
  }

  function startDraw(event) {
    if (!isDrawing || !imageWrapRef.current) return
    event.preventDefault()
    const start = pointerPosition(event, imageWrapRef.current)
    const initialRect = {x: start.x, y: start.y, width: 0, height: 0}
    dragRef.current = {type: 'draw', start, rect: initialRect}
    setDraftRect(initialRect)
  }

  function startMove(event, hotspot) {
    if (!imageWrapRef.current || isDrawing) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedKey(hotspot._key)
    dragRef.current = {
      type: 'move',
      key: hotspot._key,
      start: pointerPosition(event, imageWrapRef.current),
      rect: normalizeRect(hotspot),
    }
  }

  function startResize(event, hotspot) {
    if (!imageWrapRef.current || isDrawing) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedKey(hotspot._key)
    dragRef.current = {
      type: 'resize',
      key: hotspot._key,
      start: pointerPosition(event, imageWrapRef.current),
      rect: normalizeRect(hotspot),
    }
  }

  useEffect(() => {
    function handleMove(event) {
      const drag = dragRef.current
      const element = imageWrapRef.current
      if (!drag || !element) return

      const point = pointerPosition(event, element)

      if (drag.type === 'draw') {
        const rect = {
          x: Math.min(drag.start.x, point.x),
          y: Math.min(drag.start.y, point.y),
          width: Math.abs(point.x - drag.start.x),
          height: Math.abs(point.y - drag.start.y),
        }
        drag.rect = rect
        setDraftRect(rect)
        return
      }

      const dx = point.x - drag.start.x
      const dy = point.y - drag.start.y

      if (drag.type === 'move') {
        updateHotspot(drag.key, {
          x: clamp(drag.rect.x + dx, 0, 100 - drag.rect.width),
          y: clamp(drag.rect.y + dy, 0, 100 - drag.rect.height),
        })
        return
      }

      if (drag.type === 'resize') {
        updateHotspot(drag.key, {
          width: clamp(drag.rect.width + dx, MIN_SIZE, 100 - drag.rect.x),
          height: clamp(drag.rect.height + dy, MIN_SIZE, 100 - drag.rect.y),
        })
      }
    }

    function handleUp() {
      const drag = dragRef.current
      if (drag?.type === 'draw' && drag.rect) {
        const raw = drag.rect
        if (raw.width >= MIN_SIZE && raw.height >= MIN_SIZE) {
          const currentValue = Array.isArray(valueRef.current) ? valueRef.current : []
          const nextHotspot = makeHotspot(currentValue.length, raw, defaultDestination)
          commit([...currentValue, nextHotspot])
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
  })

  const selectedHotspot = value.find((item) => item._key === selectedKey) || value[0] || null

  return (
    <div style={{display: 'grid', gap: 16}}>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
        <button type="button" onClick={addDefaultHotspot} style={buttonStyle} disabled={!asset?.url}>
          Add hotspot
        </button>
        <button
          type="button"
          onClick={() => setIsDrawing((current) => !current)}
          style={{
            ...buttonStyle,
            background: isDrawing ? '#111' : '#fff',
            color: isDrawing ? '#fff' : '#111',
          }}
          disabled={!asset?.url}
        >
          {isDrawing ? 'Click-drag on screen…' : 'Draw hotspot on screen'}
        </button>
        <span style={{fontSize: 12, lineHeight: 1.45, color: '#666', maxWidth: 560}}>
          Draw, move, and resize directly on the screen. Position stays responsive automatically; no percentage values to enter.
        </span>
      </div>

      {!asset?.url ? (
        <div style={emptyStyle}>Upload a screen image above first, then draw hotspots directly on it.</div>
      ) : (
        <div style={{display: 'grid', gap: 12}}>
          <div
            ref={imageWrapRef}
            onPointerDown={startDraw}
            style={{
              position: 'relative',
              width: 'min(100%, 640px)',
              border: '1px solid #d8d8d8',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fff',
              cursor: isDrawing ? 'crosshair' : 'default',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <img
              src={asset.url}
              alt="Prototype screen preview"
              draggable="false"
              style={{display: 'block', width: '100%', height: 'auto', pointerEvents: 'none'}}
            />

            {value.map((hotspot, index) => {
              const rect = normalizeRect(hotspot)
              const selected = hotspot._key === selectedHotspot?._key

              return (
                <div
                  key={hotspot._key}
                  onPointerDown={(event) => startMove(event, hotspot)}
                  title={hotspot.label || `Hotspot ${index + 1}`}
                  style={{
                    position: 'absolute',
                    left: `${rect.x}%`,
                    top: `${rect.y}%`,
                    width: `${rect.width}%`,
                    height: `${rect.height}%`,
                    boxSizing: 'border-box',
                    border: selected ? '2px solid #111' : '2px solid rgba(17,17,17,.55)',
                    background: selected ? 'rgba(17,17,17,.15)' : 'rgba(17,17,17,.07)',
                    cursor: 'move',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -2,
                      top: -2,
                      transform: 'translateY(-100%)',
                      background: '#111',
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: 1,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {index + 1}. {hotspot.label || 'Hotspot'}
                  </div>
                  <div
                    onPointerDown={(event) => startResize(event, hotspot)}
                    aria-label="Resize hotspot"
                    style={{
                      position: 'absolute',
                      right: -7,
                      bottom: -7,
                      width: 14,
                      height: 14,
                      boxSizing: 'border-box',
                      background: '#111',
                      border: '2px solid #fff',
                      borderRadius: 3,
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
                  left: `${draftRect.x}%`,
                  top: `${draftRect.y}%`,
                  width: `${draftRect.width}%`,
                  height: `${draftRect.height}%`,
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
                Destination screen
                <select
                  value={selectedHotspot.nextKey || ''}
                  onChange={(event) => updateHotspot(selectedHotspot._key, {nextKey: event.target.value})}
                  style={inputStyle}
                >
                  <option value="">Choose destination…</option>
                  {screenOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                Umami event override (optional)
                <input
                  type="text"
                  value={selectedHotspot.event || ''}
                  onChange={(event) => updateHotspot(selectedHotspot._key, {event: event.target.value})}
                  placeholder="e.g. kyc_choose_ktp"
                  style={inputStyle}
                />
              </label>

              <button
                type="button"
                onClick={() => deleteHotspot(selectedHotspot._key)}
                style={{...buttonStyle, justifySelf: 'start', color: '#a12622'}}
              >
                Delete hotspot
              </button>
            </div>
          ) : (
            <div style={emptyStyle}>Draw a hotspot on the screen to make an area clickable.</div>
          )}
        </div>
      )}
    </div>
  )
}

const buttonStyle = {
  appearance: 'none',
  border: '1px solid #c9c9c9',
  borderRadius: 6,
  background: '#fff',
  color: '#111',
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #c9c9c9',
  borderRadius: 6,
  background: '#fff',
  color: '#111',
  padding: '9px 10px',
  font: 'inherit',
}

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
}

const editorStyle = {
  display: 'grid',
  gap: 12,
  maxWidth: 640,
  padding: 14,
  border: '1px solid #e2e2e2',
  borderRadius: 8,
  background: '#fafafa',
}

const emptyStyle = {
  padding: 14,
  border: '1px dashed #c9c9c9',
  borderRadius: 8,
  color: '#666',
  fontSize: 13,
}
