// Carnet estudiantil digital con QR de verificación y constancia de estudio imprimible
import { useState } from 'react'
import { Caja, ConDatos, Icono, useApi } from '../componentes/ui.jsx'
import CodigoQR from '../compartido/CodigoQR.jsx'
import { useVistaEstudiante } from './contexto.js'

const enlaceVerificacion = (codigo) => `${window.location.origin}/verificar/${codigo}`

export default function Carnet() {
  const { base } = useVistaEstudiante()
  const consulta = useApi(`${base}/carnet`)
  const [constancia, setConstancia] = useState(false)

  return (
    <ConDatos consulta={consulta}>
      {(c) => (
        <>
          <div className="carnet-pagina no-imprimir">
            <article className="carnet">
              <header>
                <img src="/escudo.jpeg" alt="" />
                <div>
                  <strong>Institución Educativa Máximo Mercado</strong>
                  <span>Sabanalarga, Atlántico</span>
                </div>
              </header>
              <div className="carnet-cuerpo">
                <div className="carnet-foto" aria-hidden="true">{c.nombres[0]}{c.apellidos[0]}</div>
                <div className="carnet-datos">
                  <span className="carnet-etiqueta">Estudiante</span>
                  <strong>{c.nombres} {c.apellidos}</strong>
                  <span>Doc. {c.documento}</span>
                  <span>Grado {c.grado} · {c.jornada}</span>
                  <span className={`chip ${c.estado === 'activa' ? 'ok' : 'alerta'}`}>{c.estado === 'activa' ? `Matrícula activa ${c.anio}` : `Matrícula ${c.estado}`}</span>
                </div>
              </div>
              <footer>
                <CodigoQR texto={enlaceVerificacion(c.codigo)} tamano={112} alt="QR para verificar el carnet" />
                <small>Escanea para verificar<br />Código {c.codigo}</small>
              </footer>
            </article>

            <Caja titulo="Constancia de estudio">
              <p className="texto-suave">
                Documento que certifica que el estudiante está matriculado este año. Se puede verificar escaneando su código QR,
                así que sirve para trámites (subsidios, transporte, EPS…).
              </p>
              <div className="form-acciones">
                <button className="btn-primario" onClick={() => { setConstancia(true); setTimeout(() => window.print(), 300) }}>
                  <Icono nombre="print" /> Imprimir o guardar en PDF
                </button>
                <button className="btn-secundario" onClick={() => setConstancia(!constancia)}>{constancia ? 'Ocultar' : 'Ver'} constancia</button>
              </div>
            </Caja>
          </div>
          {constancia && <Constancia c={c} />}
        </>
      )}
    </ConDatos>
  )
}

function Constancia({ c }) {
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <article className="boletin constancia">
      <header className="boletin-encabezado">
        <img src="/escudo.jpeg" alt="Escudo IEMM" />
        <div>
          <h2>Institución Educativa Máximo Mercado</h2>
          <p>Estudio · Libertad · Paz</p>
          <p>Sabanalarga, Atlántico</p>
        </div>
      </header>
      <h3 className="constancia-titulo">Constancia de estudio</h3>
      <p>
        La Institución Educativa Máximo Mercado de Sabanalarga (Atlántico) hace constar que <strong>{c.nombres} {c.apellidos}</strong>,
        identificado(a) con documento No. <strong>{c.documento}</strong>, se encuentra matriculado(a) en el grado <strong>{c.grado}</strong>,
        jornada {c.jornada.toLowerCase()}, durante el año lectivo <strong>{c.anio}</strong>, con matrícula {c.estado}.
      </p>
      <p>Se expide a solicitud del interesado en Sabanalarga, el {hoy}.</p>
      <div className="constancia-pie">
        <div className="constancia-firma">
          <span />
          <strong>Secretaría Académica</strong>
          <small>Institución Educativa Máximo Mercado</small>
        </div>
        <div className="constancia-qr">
          <CodigoQR texto={enlaceVerificacion(c.codigo)} tamano={110} alt="QR de verificación" />
          <small>Verifique esta constancia escaneando el código o en {window.location.host}/verificar/{c.codigo}</small>
        </div>
      </div>
    </article>
  )
}
