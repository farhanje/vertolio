'use client'

import {useMemo, useState} from 'react'
import {PatchEvent, set, unset} from 'sanity'

const VARIANT_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function createKey() {
  return Math.random().toString(36).slice(2, 12)
}

function getItemId(item) {
  return item?.screenId || item?._key || null
}

function nextVariantKey(variants = []) {
  const used = new Set(variants.map((variant) => String(variant?.key || '').trim().toUpperCase()).filter(Boolean))
  return VARIANT_KEYS.find((key) => !used.has(key)) || `V${variants.length + 1}`
}

function rekeyVariant(sourceVariant, nextKey) {
  const screenIdMap = new Map()

  function cloneValue(value) {
    if (Array.isArray(value)) return value.map(cloneValue)

    if (!value || typeof value !== 'object') return value

    const previousId = getItemId(value)
    const next = {}
    const nextKeyForObject = value._key ? createKey() : null

    Object.entries(value).forEach(([key, childValue]) => {
      if (key === '_key' && nextKeyForObject) {
        next._key = nextKeyForObject
        return
      }

      next[key] = cloneValue(childValue)
    })

    if (nextKeyForObject && value._type === 'studyScreen') {
      const nextScreenId = nextKeyForObject
      if (previousId) screenIdMap.set(previousId, nextScreenId)
      next.screenId = nextScreenId
    }

    if (nextKeyForObject && value._type === 'studyHotspot') {
      next.hotspotId = nextKeyForObject
    }

    if (nextKeyForObject && (value._type === 'studyQuestion' || value.stepType === 'question')) {
      next.questionId = nextKeyForObject
    }

    if (nextKeyForObject && (value._type === 'studyTask' || value.stepType === 'task')) {
      next.taskId = nextKeyForObject
    }

    return next
  }

  const copiedVariant = cloneValue(sourceVariant)
  copiedVariant._key = createKey()
  copiedVariant.key = nextKey
  copiedVariant.label = sourceVariant?.label ? `${sourceVariant.label} copy` : `Variant ${nextKey}`

  function remapTargets(value) {
    if (Array.isArray(value)) return value.map(remapTargets)
    if (!value || typeof value !== 'object') return value

    const next = {...value}
    Object.entries(next).forEach(([key, childValue]) => {
      next[key] = remapTargets(childValue)
    })

    if (next.targetScreenId && screenIdMap.has(next.targetScreenId)) {
      next.targetScreenId = screenIdMap.get(next.targetScreenId)
    }

    return next
  }

  return remapTargets(copiedVariant)
}

export default function VariantArrayInput(props) {
  const {value = [], onChange, renderDefault} = props
  const [sourceKey, setSourceKey] = useState('')

  const selectedIndex = useMemo(() => {
    if (!value.length) return -1
    if (!sourceKey) return 0
    return value.findIndex((variant) => (variant?._key || variant?.key) === sourceKey)
  }, [sourceKey, value])

  const selectedVariant = selectedIndex >= 0 ? value[selectedIndex] : null

  function duplicateSelectedVariant() {
    if (!selectedVariant) return

    const nextKey = nextVariantKey(value)
    const duplicate = rekeyVariant(selectedVariant, nextKey)
    const insertAt = selectedIndex + 1
    const nextValue = [...value.slice(0, insertAt), duplicate, ...value.slice(insertAt)]

    onChange(PatchEvent.from(nextValue.length ? set(nextValue) : unset()))
    setSourceKey(duplicate._key || duplicate.key || '')
  }

  return (
    <div>
      <div style={{border: '1px solid #d9d9d9', padding: 16, marginBottom: 16, background: '#fafafa'}}>
        <strong style={{display: 'block', marginBottom: 6}}>Duplicate variant</strong>
        <p style={{margin: '0 0 12px', color: '#666', fontSize: 13, lineHeight: 1.4}}>
          Copy an existing version, including study flow, screens, hotspots, and questions. After copying, edit only the parts that differ.
        </p>
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'}}>
          <select
            value={sourceKey}
            onChange={(event) => setSourceKey(event.target.value)}
            style={{minWidth: 220, padding: 8}}
          >
            {value.map((variant, index) => {
              const optionKey = variant?._key || variant?.key || String(index)
              const title = variant?.label || variant?.key || `Variant ${index + 1}`
              const suffix = variant?.key ? ` · ${variant.key}` : ''
              return <option key={optionKey} value={optionKey}>{title}{suffix}</option>
            })}
          </select>
          <button
            type="button"
            onClick={duplicateSelectedVariant}
            disabled={!selectedVariant}
            style={{padding: '8px 12px', border: '1px solid #111', background: '#111', color: '#fff', cursor: selectedVariant ? 'pointer' : 'not-allowed'}}
          >
            Copy selected variant
          </button>
        </div>
      </div>
      {renderDefault(props)}
    </div>
  )
}
