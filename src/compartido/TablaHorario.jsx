import { DIAS } from '../util.js'
import { Vacio } from '../componentes/ui.jsx'

// bloques: [{ dia (1-5), inicio, fin, asignatura }]
export default function TablaHorario({ bloques }) {
  if (!bloques.length) return <Vacio icono="calendar_month">No hay horario registrado.</Vacio>

  const franjas = [...new Set(bloques.map((b) => `${b.inicio}–${b.fin}`))]
  return (
    <div className="tabla-scroll">
      <table className="tabla horario">
        <thead>
          <tr>
            <th>Hora</th>
            {DIAS.map((d) => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {franjas.map((franja) => (
            <tr key={franja}>
              <td><strong>{franja}</strong></td>
              {DIAS.map((_, i) => {
                const b = bloques.find((x) => `${x.inicio}–${x.fin}` === franja && x.dia === i + 1)
                return <td key={i}>{b?.asignatura ?? ''}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
