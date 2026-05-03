import { useCallback, useMemo, Component } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ─── 错误边界 ──────────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e?.message ?? String(e) } }
  componentDidCatch(e, info) { console.error('[StoryMapView]', e, info) }
  render() {
    if (this.state.error)
      return (
        <div className="w-full h-[400px] flex items-center justify-center bg-gray-700/30 rounded-lg text-red-400 text-sm p-4 text-center">
          图谱渲染失败：{this.state.error}
        </div>
      )
    return this.props.children
  }
}

// ─── 自定义节点 ───────────────────────────────────────────────────────────────
function CharacterNode({ data }) {
  return (
    <div className="bg-blue-950 border border-blue-400 rounded-xl px-3 py-2 min-w-[110px] max-w-[170px] shadow-lg">
      <div className="text-white font-bold text-sm leading-tight">{data.name}</div>
      {data.description && (
        <div className="text-blue-300 text-xs mt-1 leading-snug">{data.description}</div>
      )}
    </div>
  )
}

function EventNode({ data }) {
  return (
    <div className="bg-orange-950 border border-orange-400 rounded-xl px-3 py-2 min-w-[110px] max-w-[170px] shadow-lg">
      <div className="text-white font-bold text-sm leading-tight">{data.title}</div>
      {data.description && (
        <div className="text-orange-300 text-xs mt-1 leading-snug">{data.description}</div>
      )}
    </div>
  )
}

const nodeTypes = { character: CharacterNode, event: EventNode }

// ─── 关系颜色 ─────────────────────────────────────────────────────────────────
function edgeColor(type = '') {
  if (/朋友|好友|盟友|友好|friend|ally/i.test(type)) return '#22c55e'
  if (/对立|敌|仇|反|enemy|rival|oppos/i.test(type)) return '#ef4444'
  return '#9ca3af'
}

// ─── 数据校验 + 节点/边构建 ───────────────────────────────────────────────────
function buildGraph(raw) {
  const characters = Array.isArray(raw?.characters) ? raw.characters : []
  const events     = Array.isArray(raw?.events)     ? raw.events     : []
  const rels       = Array.isArray(raw?.relationships) ? raw.relationships : []

  const COLS = 4, COL_W = 210, ROW_H = 150

  const validChars  = characters.filter(c => c?.id && c?.name)
  const validEvents = events.filter(e => e?.id && e?.title)
  const validIds    = new Set([...validChars.map(c => String(c.id)), ...validEvents.map(e => String(e.id))])

  const charRows = Math.max(1, Math.ceil(validChars.length / COLS))

  const nodes = [
    ...validChars.map((c, i) => ({
      id: String(c.id),
      type: 'character',
      position: { x: (i % COLS) * COL_W, y: Math.floor(i / COLS) * ROW_H },
      data: { name: c.name, description: c.description ?? '' },
    })),
    ...validEvents.map((e, i) => ({
      id: String(e.id),
      type: 'event',
      position: {
        x: (i % COLS) * COL_W,
        y: charRows * ROW_H + 60 + Math.floor(i / COLS) * ROW_H,
      },
      data: { title: e.title, description: e.description ?? '' },
    })),
  ]

  const edges = rels
    .filter(r => r?.source && r?.target && validIds.has(String(r.source)) && validIds.has(String(r.target)))
    .map((r, i) => {
      const color = edgeColor(r.type ?? '')
      return {
        id: `e${i}`,
        source: String(r.source),
        target: String(r.target),
        label: r.type ?? '',
        labelStyle: { fill: color, fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#111827', fillOpacity: 0.85 },
        labelBgPadding: [4, 2],
        style: { stroke: color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      }
    })

  return { nodes, edges }
}

// ─── 内部画布 ──────────────────────────────────────────────────────────────────
function FlowInner({ data }) {
  const { fitView } = useReactFlow()
  const { nodes: initN, edges: initE } = useMemo(() => buildGraph(data), [data])
  const [nodes, , onNodesChange] = useNodesState(initN)
  const [edges, , onEdgesChange] = useEdgesState(initE)
  const fit = useCallback(() => fitView({ padding: 0.15, duration: 300 }), [fitView])

  if (!nodes.length)
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-gray-700/30 rounded-lg text-gray-400 text-sm">
        未识别到角色或事件
      </div>
    )

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-gray-600" style={{ height: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <button
        onClick={fit}
        className="absolute bottom-14 right-3 bg-gray-700 hover:bg-gray-500 text-white text-xs px-2 py-1 rounded shadow z-10 transition-colors"
      >
        fit
      </button>
    </div>
  )
}

// ─── 导出组件 ─────────────────────────────────────────────────────────────────
export default function StoryMapView({ data }) {
  if (!data) return null
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <FlowInner data={data} />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
