// Cliente HTTP de la API. Todas las llamadas usan la cookie de sesión (same-origin)
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let alExpirarSesion = () => {};
export const definirAlExpirarSesion = (fn) => { alExpirarSesion = fn; };

async function peticion(metodo, url, cuerpo) {
  let res;
  try {
    res = await fetch(`/api${url}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor', 'RED');
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    const e = datos && datos.error ? datos.error : {};
    if (res.status === 401 && e.code === 'NO_AUTH') alExpirarSesion();
    throw new ApiError(res.status, e.message || 'Ocurrió un error inesperado', e.code);
  }
  return datos;
}

export const api = {
  get: (u) => peticion('GET', u),
  post: (u, b = {}) => peticion('POST', u, b),
  put: (u, b = {}) => peticion('PUT', u, b),
  patch: (u, b = {}) => peticion('PATCH', u, b),
  del: (u) => peticion('DELETE', u),
};

export const query = (obj) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== '' && v !== null && v !== undefined) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};
