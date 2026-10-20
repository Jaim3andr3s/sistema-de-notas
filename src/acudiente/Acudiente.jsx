// Panel del acudiente: las mismas pantallas del estudiante, en solo lectura, para cada hijo a cargo
import { useEffect, useState } from 'react'
import Layout from '../componentes/Layout.jsx'
import { ConDatos, Vacio, useApi } from '../componentes/ui.jsx'
import { VISTAS } from '../estudiante/Estudiante.jsx'
import { VistaEstudiante } from '../estudiante/contexto.js'
import Mensajes from '../compartido/Mensajes.jsx'
import Perfil from '../compartido/Perfil.jsx'
import Calendario from '../compartido/Calendario.jsx'
import { nombreCompleto } from '../util.js'

const MENU = [
  { id: 'inicio', nombre: 'Inicio', icono: 'home' },
  { id: 'notas', nombre: 'Notas', icono: 'grading' },
  { id: 'semaforo', nombre: 'Semáforo', icono: 'traffic' },
  { id: 'actividades', nombre: 'Tareas y actividades', icono: 'assignment' },
  { id: 'mensajes', nombre: 'Mensajes', icono: 'chat' },
  { id: 'calendario', nombre: 'Calendario', icono: 'event' },
  { id: 'horario', nombre: 'Horario', icono: 'calendar_month' },
  { id: 'asistencia', nombre: 'Asistencia', icono: 'event_available' },
  { id: 'observador', nombre: 'Observador', icono: 'fact_check' },
  { id: 'boletines', nombre: 'Boletines', icono: 'description' },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'person' },
]

// Mensajes, calendario (de todos sus hijos) y perfil son del acudiente; lo demás es del hijo elegido
const PROPIAS = { mensajes: Mensajes, calendario: Calendario, perfil: Perfil }

export default function Acudiente({ usuario, onSalir }) {
  const [vista, setVista] = useState('inicio')
  const hijos = useApi('/acudiente/hijos')
  const [hijoId, setHijoId] = useState(null)

  useEffect(() => {
    if (!hijoId && hijos.datos?.length) setHijoId(hijos.datos[0].id)
  }, [hijos.datos, hijoId])

  const hijo = hijos.datos?.find((h) => h.id === hijoId)
  const Vista = PROPIAS[vista] ?? VISTAS[vista]

  return (
    <Layout menu={MENU} vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir}>
      <ConDatos consulta={hijos}>
        {(lista) => lista.length === 0 ? (
          <Vacio icono="family_restroom">Todavía no tienes estudiantes a cargo. Pide a la secretaría del colegio que vincule tu cuenta con la de tu hijo o hija.</Vacio>
        ) : (
          <>
            {!PROPIAS[vista] && (
              <div className="selector-hijo">
                <span className="material-icons" aria-hidden="true">family_restroom</span>
                {lista.length > 1 ? (
                  <label>
                    Estudiante:
                    <select value={hijoId ?? ''} onChange={(e) => setHijoId(Number(e.target.value))}>
                      {lista.map((h) => <option key={h.id} value={h.id}>{nombreCompleto(h)} · {h.grado ?? 'sin grado'}</option>)}
                    </select>
                  </label>
                ) : (
                  <span>Estudiante: <strong>{nombreCompleto(lista[0])}</strong> · {lista[0].grado}</span>
                )}
              </div>
            )}
            {hijo && (
              <VistaEstudiante.Provider key={hijo.id} value={{ base: `/acudiente/hijos/${hijo.id}`, soloLectura: true, menu: MENU }}>
                <Vista usuario={usuario} ir={setVista} />
              </VistaEstudiante.Provider>
            )}
          </>
        )}
      </ConDatos>
    </Layout>
  )
}
