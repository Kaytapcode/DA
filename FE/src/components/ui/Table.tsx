import React from 'react'
import MuiTable from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

interface Column {
  key: string
  header: string
}

interface TableProps {
  columns: Column[]
  data: Record<string, unknown>[]
}

export const Table: React.FC<TableProps> = ({ columns, data }) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <MuiTable size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.key}>{col.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => {
            const rowKey = typeof row.id === 'string' || typeof row.id === 'number' ? row.id : index;
            return (
              <TableRow key={rowKey} hover>
                {columns.map((col) => (
                  <TableCell key={`${rowKey}-${col.key}`}>
                    {row[col.key] == null ? '' : String(row[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </MuiTable>
    </TableContainer>
  )
}
