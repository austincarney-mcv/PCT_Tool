import api from './client'

export const drawingsApi = {
  list:    (pid, discipline) => api.get(`/projects/${pid}/drawings`, { params: discipline ? { discipline } : {} }).then(r => r.data),
  create:  (pid, data)       => api.post(`/projects/${pid}/drawings`, data).then(r => r.data),
  update:  (pid, did, data)  => api.put(`/projects/${pid}/drawings/${did}`, data).then(r => r.data),
  remove:  (pid, did)        => api.delete(`/projects/${pid}/drawings/${did}`).then(r => r.data),
  reorder: (pid, items)      => api.put(`/projects/${pid}/drawings/reorder`, { items }).then(r => r.data),
}
