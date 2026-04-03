import { motion } from 'framer-motion'
import Skeleton from './Skeleton'

/**
 * DataTable — reusable professional table with skeleton loading, tokens and animations.
 *
 * Props:
 *   columns      Array<{ key, label, render?, skeleton?, width?, align? }>
 *   data         Array<object>
 *   loading      boolean
 *   fixedRows    number — always render this many rows (fills with ghost rows). Also used as skeleton row count.
 *   rowHeight    number — px height for every row (default 62). Used to lock table height via inline styles.
 *   emptyMessage string
 *   rowKey       string | fn(row) — key extractor (default 'id')
 *   style        object
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  fixedRows = 5,
  rowHeight = 62,
  emptyMessage = 'No hay registros disponibles.',
  rowKey = 'id',
  style,
}) {
  const getKey    = typeof rowKey === 'function' ? rowKey : (row) => row[rowKey]
  const ghostCount = Math.max(0, fixedRows - data.length)
  const rowStyle  = { height: `${rowHeight}px` }
  const cellStyle = { height: `${rowHeight}px` }

  return (
    <div className="dt-wrap" style={style}>
      <table className="dt-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="dt-th"
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: fixedRows }).map((_, ri) => (
              <tr key={`skel-${ri}`} className="dt-tr dt-tr--skeleton" style={rowStyle}>
                {columns.map((col) => (
                  <td key={col.key} className="dt-td" style={cellStyle}>
                    {col.skeleton
                      ? col.skeleton()
                      : <Skeleton variant="text" width="70%" height="14px" />
                    }
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <>
              {data.length === 0 ? (
                /* Empty state spans all columns but keeps the same row height */
                Array.from({ length: fixedRows }).map((_, ri) => (
                  <tr key={`empty-${ri}`} className="dt-tr dt-tr--ghost" style={rowStyle}>
                    {ri === Math.floor(fixedRows / 2) ? (
                      <td colSpan={columns.length} className="dt-td" style={{ ...cellStyle, textAlign: 'center' }}>
                        <span style={{
                          display: 'block',
                          color: 'var(--outline)',
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>inbox</span>
                          {emptyMessage}
                        </span>
                      </td>
                    ) : (
                      columns.map((col) => (
                        <td key={col.key} className="dt-td" style={cellStyle} />
                      ))
                    )}
                  </tr>
                ))
              ) : (
                <>
                  {data.map((row, ri) => (
                    <motion.tr
                      key={getKey(row)}
                      className="dt-tr"
                      style={rowStyle}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18, delay: ri * 0.04 }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="dt-td"
                          style={{ ...cellStyle, textAlign: col.align ?? 'left' }}
                        >
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </motion.tr>
                  ))}

                  {/* Ghost rows — keep fixed table height at all times */}
                  {Array.from({ length: ghostCount }).map((_, gi) => (
                    <tr key={`ghost-${gi}`} className="dt-tr dt-tr--ghost" style={rowStyle}>
                      {columns.map((col) => (
                        <td key={col.key} className="dt-td" style={cellStyle} />
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
