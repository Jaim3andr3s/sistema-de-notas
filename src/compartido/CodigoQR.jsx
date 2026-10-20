import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Código QR como imagen (se genera en el navegador, sin servicios externos)
export default function CodigoQR({ texto, tamano = 180, alt = 'Código QR' }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(texto, { margin: 1, width: tamano * 2, color: { dark: '#1c3d73', light: '#ffffff' } }).then(setSrc).catch(() => setSrc(null))
  }, [texto, tamano])
  return src ? <img src={src} width={tamano} height={tamano} alt={alt} className="codigo-qr" /> : <span className="codigo-qr" style={{ width: tamano, height: tamano }} />
}
