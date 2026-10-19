import { Nota, Etiqueta } from '../componentes/ui.jsx'
import { TIPOS_OBSERVACION, fecha } from '../util.js'

// Boletín de un estudiante en un periodo (datos de /boletin). Se imprime con window.print()
export default function Boletin({ datos }) {
  const { estudiante, grado, periodos, periodo, asignaturas } = datos
  const totalFallas = asignaturas.reduce((a, x) => a + x.fallas, 0)

  return (
    <article className="boletin">
      <header className="boletin-encabezado">
        <img src="/escudo.jpeg" alt="Escudo IEMM" />
        <div>
          <h2>Institución Educativa Máximo Mercado</h2>
          <p>Estudio · Libertad · Paz</p>
          <h3>Informe académico · {periodo.nombre} · {grado.anio}</h3>
        </div>
      </header>

      <dl className="boletin-datos">
        <div><dt>Estudiante</dt><dd>{estudiante.apellidos} {estudiante.nombres}</dd></div>
        <div><dt>Documento</dt><dd>{estudiante.documento}</dd></div>
        <div><dt>Grado</dt><dd>{grado.nombre} · {grado.jornada}</dd></div>
        <div><dt>Director de grupo</dt><dd>{grado.director || '—'}</dd></div>
      </dl>

      <div className="tabla-scroll">
        <table className="tabla boletin-tabla">
          <thead>
            <tr>
              <th>Asignatura</th>
              <th>IH</th>
              {periodos.map((p) => (
                <th key={p.id} className={p.id === periodo.id ? 'col-activa' : ''}>P{p.numero}</th>
              ))}
              <th>Acum.</th>
              <th>Desempeño</th>
              <th>Fallas</th>
            </tr>
          </thead>
          <tbody>
            {asignaturas.map((a) => (
              <tr key={a.carga_id}>
                <td>
                  <strong>{a.asignatura}</strong>
                  <small>{a.docente}</small>
                  {a.observacion && <small className="obs-nota">{a.observacion}</small>}
                </td>
                <td>{a.ih}</td>
                {a.notas.map((n, i) => (
                  <td key={i} className={periodos[i].id === periodo.id ? 'col-activa' : ''}><Nota valor={n} /></td>
                ))}
                <td><Nota valor={a.acumulado} /></td>
                <td><Etiqueta valor={a.nota} /></td>
                <td>{a.fallas}{a.retardos ? <small>{a.retardos} ret.</small> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="boletin-resumen">
        <div><span>Promedio del periodo</span><strong>{datos.promedio?.toFixed(2) ?? '—'}</strong></div>
        <div><span>Desempeño</span><strong>{datos.desempeno ?? '—'}</strong></div>
        <div><span>Puesto</span><strong>{datos.puesto ? `${datos.puesto} de ${datos.total_estudiantes}` : '—'}</strong></div>
        <div><span>Fallas del periodo</span><strong>{totalFallas}</strong></div>
      </div>

      {datos.observaciones.length > 0 && (
        <div className="boletin-observaciones">
          <h4>Observaciones del periodo</h4>
          <ul>
            {datos.observaciones.map((o, i) => (
              <li key={i}><strong>{fecha(o.fecha)} · {TIPOS_OBSERVACION[o.tipo]}:</strong> {o.descripcion}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="boletin-firmas">
        <div><span />Director(a) de grupo</div>
        <div><span />Rector(a)</div>
      </footer>
    </article>
  )
}
