// Consolidados y boletines por grado — usados por docentes y administrador
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Caja, ConDatos, Nota, Escala, Icono, Vacio, Aviso, Cargando, useApi } from '../componentes/ui.jsx'
import Boletin from './Boletin.jsx'

// Selector de grado con los grados a los que tiene acceso el usuario
export function SelectorGrado({ valor, onCambio }) {
  const grados = useApi('/reportes/grados')
  useEffect(() => {
    if (!valor && grados.datos?.length) onCambio(grados.datos[0].id)
  }, [grados.datos, valor, onCambio])

  return (
    <select value={valor ?? ''} onChange={(e) => onCambio(Number(e.target.value))} disabled={!grados.datos}>
      {grados.datos?.map((g) => (
        <option key={g.id} value={g.id}>{g.nombre} · {g.anio}{g.soy_director ? ' (director)' : ''}</option>
      ))}
    </select>
  )
}

function exportarCsv(c) {
  const encabezado = ['Puesto', 'Documento', 'Estudiante', ...c.asignaturas.map((a) => a.asignatura), 'Promedio', 'Asig. en Bajo', 'Fallas']
  // Excel en español usa coma decimal y punto y coma como separador
  const num = (n, d) => (n == null ? '' : n.toFixed(d).replace('.', ','))
  const filas = c.estudiantes.map((e) => [
    e.puesto ?? '', e.documento, e.nombre,
    ...c.asignaturas.map((a) => num(e.notas[a.carga_id], 1)),
    num(e.promedio, 2), e.en_bajo, e.fallas,
  ])
  const csv = [encabezado, ...filas]
    .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `consolidado-${c.grado.nombre}-${c.periodo?.nombre ?? 'acumulado'}.csv`.replace(/[°\s]/g, '')
  a.click()
  URL.revokeObjectURL(url)
}

export function Consolidado() {
  const [gradoId, setGradoId] = useState(null)
  const [periodo, setPeriodo] = useState('')
  const consulta = useApi(gradoId ? `/reportes/grados/${gradoId}/consolidado${periodo ? `?periodo=${periodo}` : ''}` : null)

  return (
    <Caja
        titulo="Consolidado de notas"
        className="imprimible"
        acciones={
          <>
            <SelectorGrado valor={gradoId} onCambio={setGradoId} />
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="">Acumulado del año</option>
              {consulta.datos?.periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {consulta.datos && (
              <>
                <button className="btn-secundario no-imprimir" onClick={() => exportarCsv(consulta.datos)}>
                  <Icono nombre="download" /> Excel
                </button>
                <button className="btn-secundario no-imprimir" onClick={() => window.print()}>
                  <Icono nombre="print" /> Imprimir
                </button>
              </>
            )}
          </>
        }
      >
        <ConDatos consulta={consulta}>
          {(c) => (
            <>
              <div className="mini-tarjetas">
                <div><span>Estudiantes</span><strong>{c.estudiantes.length}</strong></div>
                <div><span>Promedio del grado</span><strong>{c.resumen.promedio_grado?.toFixed(2) ?? '—'}</strong></div>
                <div className="alerta"><span>Con asignaturas en Bajo</span><strong>{c.resumen.estudiantes_en_riesgo}</strong></div>
                <div><span>Director de grupo</span><strong className="texto">{c.grado.director || '—'}</strong></div>
              </div>
              {c.estudiantes.length === 0 ? (
                <Vacio icono="groups">Este grado no tiene estudiantes matriculados.</Vacio>
              ) : (
                <div className="tabla-scroll">
                  <table className="tabla consolidado">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th className="col-nombre">Estudiante</th>
                        {c.asignaturas.map((a) => (
                          <th key={a.carga_id} className="vertical" title={`${a.asignatura} · ${a.docente ?? ''}`}>
                            <span>{a.asignatura}</span>
                          </th>
                        ))}
                        <th>Prom.</th>
                        <th>Bajo</th>
                        <th>Fallas</th>
                        <th>Puesto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.estudiantes.map((e, i) => (
                        <tr key={e.matricula_id} className={e.en_bajo ? 'fila-riesgo' : ''}>
                          <td>{i + 1}</td>
                          <td className="col-nombre"><strong>{e.nombre}</strong><small>{e.documento}</small></td>
                          {c.asignaturas.map((a) => <td key={a.carga_id}><Nota valor={e.notas[a.carga_id]} /></td>)}
                          <td><Nota valor={e.promedio} /></td>
                          <td>{e.en_bajo || ''}</td>
                          <td>{e.fallas}</td>
                          <td><strong>{e.puesto ?? '—'}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td />
                        <td className="col-nombre"><strong>Promedio asignatura</strong></td>
                        {c.asignaturas.map((a) => (
                          <td key={a.carga_id}><Nota valor={c.resumen.por_asignatura[a.carga_id].promedio} /></td>
                        ))}
                        <td><Nota valor={c.resumen.promedio_grado} /></td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <Escala />
            </>
          )}
        </ConDatos>
    </Caja>
  )
}

export function Boletines() {
  const [gradoId, setGradoId] = useState(null)
  const [periodo, setPeriodo] = useState(null)
  const [seleccion, setSeleccion] = useState('')
  const [boletines, setBoletines] = useState(null)
  const [estado, setEstado] = useState({ cargando: false, error: '' })

  const grado = useApi(gradoId ? `/reportes/grados/${gradoId}/estudiantes` : null)
  const periodos = useApi('/docente/periodos')
  const delAnio = periodos.datos?.filter((p) => p.anio === grado.datos?.grado.anio) ?? []

  useEffect(() => {
    if (!periodo && delAnio.length) setPeriodo((delAnio.findLast((p) => p.cerrado) ?? delAnio[0]).id)
  }, [delAnio, periodo])

  useEffect(() => {
    setBoletines(null)
    setSeleccion('')
  }, [gradoId])

  async function generar() {
    if (!periodo || !grado.datos) return
    const lista = seleccion ? grado.datos.estudiantes.filter((e) => e.matricula_id === Number(seleccion)) : grado.datos.estudiantes
    setEstado({ cargando: true, error: '' })
    try {
      setBoletines(await Promise.all(lista.map((e) => api(`/reportes/boletin/${e.matricula_id}?periodo=${periodo}`))))
      setEstado({ cargando: false, error: '' })
    } catch (err) {
      setEstado({ cargando: false, error: err.message })
    }
  }

  return (
    <>
      <Caja
        titulo="Generar boletines"
        className="no-imprimir"
        acciones={
          <>
            <SelectorGrado valor={gradoId} onCambio={setGradoId} />
            <select value={periodo ?? ''} onChange={(e) => { setPeriodo(Number(e.target.value)); setBoletines(null) }}>
              {delAnio.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.cerrado ? '' : ' (abierto)'}</option>)}
            </select>
          </>
        }
      >
        <div className="fila-form">
          <select value={seleccion} onChange={(e) => { setSeleccion(e.target.value); setBoletines(null) }}>
            <option value="">Todo el grado ({grado.datos?.estudiantes.length ?? 0} estudiantes)</option>
            {grado.datos?.estudiantes.map((e) => (
              <option key={e.matricula_id} value={e.matricula_id}>{e.apellidos} {e.nombres}</option>
            ))}
          </select>
          <button className="btn-primario" onClick={generar} disabled={estado.cargando || !grado.datos}>
            {estado.cargando ? 'Generando…' : 'Generar'}
          </button>
          {boletines && (
            <button className="btn-secundario" onClick={() => window.print()}>
              <Icono nombre="print" /> Imprimir / PDF
            </button>
          )}
        </div>
        <Aviso>{estado.error}</Aviso>
      </Caja>
      {estado.cargando && <Cargando />}
      {boletines?.map((b, i) => <Boletin key={i} datos={b} />)}
    </>
  )
}
