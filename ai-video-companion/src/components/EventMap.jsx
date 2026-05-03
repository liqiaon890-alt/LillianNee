import { useCallback, useMemo, useEffect, Component } from 'react'
import {
  ReactFlow, Background, Controls, MarkerType,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e?.message ?? String(e) } }
  render() {
    if (this.state.error)
      return (
        <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', borderRadius: 12, color: '#ef4444', fontSize: 13, padding: 16, textAlign: 'center' }}>
          事件图谱渲染失败：{this.state.error}
        </div>
      )
    return this.props.children
  }
}

function EventNode({ data }) {
  return (
    <div style={{
      background: '#1a1000',
      border: '1.5px solid #FF6600',
      borderRadius: 8,
      padding: '10px 14px',
      width: 150,
      boxShadow: '0 2px 12px rgba(255,102,0,0.15)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>{data.title}</div>
      {data.description && (
        <div style={{
          fontSize: 11, color: '#888', marginTop: 5, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {data.description}
        </div>
      )}
      {data.time && (
        <div style={{ fontSize: 10, color: '#FF6600', marginTop: 6, fontWeight: 500 }}>{data.time}</div>
      )}
    </div>
  )
}

const nodeTypes = { eventNode: EventNode }

function buildGraph(raw) {
  const events   = Array.isArray(raw?.events) ? raw.events.filter(e => e?.id && e?.title) : []
  const rawEdges = Array.isArray(raw?.edges)  ? raw.edges : []

  const nodes = events.map((e, i) => ({
    id: String(e.id),
    type: 'eventNode',
    position: { x: 80 + i * 200, y: 200 },
    data: { title: e.title, description: e.description ?? '', time: e.time ?? '' },
  }))

  const validIds = new Set(events.map(e => String(e.id)))
  const edges = rawEdges
    .filter(r => r?.source && r?.target && validIds.has(String(r.source)) && validIds.has(String(r.target)))
    .map((r, i) => ({
      id: `e${i}`,
      source: String(r.source),
      target: String(r.target),
      label: r.label ?? '',
      animated: true,
      style: { stroke: '#FF6600', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6600' },
      labelStyle: { fontSize: 11, fill: '#aaa' },
      labelBgStyle: { fill: '#1a1a1a', fillOpacity: 1 },
      labelBgPadding: [6, 2],
      labelBgBorderRadius: 3,
    }))

  return { nodes, edges }
}

function FlowInner({ data }) {
  const { fitView } = useReactFlow()
  const { nodes: initN, edges: initE } = useMemo(() => buildGraph(data), [data])
  const [nodes, , onNodesChange] = useNodesState(initN)
  const [edges, , onEdgesChange] = useEdgesState(initE)
  const fit = useCallback(() => fitView({ padding: 0.2, duration: 300 }), [fitView])

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 150)
    return () => clearTimeout(t)
  }, [fitView])

  if (!nodes.length)
    return (
      <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d0d', borderRadius: 12, color: '#555', fontSize: 13 }}>
        未识别到事件
      </div>
    )

  return (
    <div style={{ width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15} maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        onInit={(rf) => setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 150)}
      >
        <Background color="#2a2a2a" gap={18} style={{ background: '#0d0d0d' }} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <button
        onClick={fit}
        style={{
          position: 'absolute', bottom: 60, right: 12,
          background: '#1e1e1e', border: '1px solid #333',
          color: '#aaa', fontSize: 11, padding: '3px 8px',
          borderRadius: 6, cursor: 'pointer', zIndex: 10,
        }}
      >
        fit
      </button>
    </div>
  )
}

export default function EventMap({ data }) {
  if (!data) return null
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowInner data={data} />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
