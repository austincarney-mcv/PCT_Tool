import api from './client'

export const resourcesApi = {
  list:    pid           => api.get(`/projects/${pid}/resources`).then(r => r.data),
  create:  (pid, d)      => api.post(`/projects/${pid}/resources`, d).then(r => r.data),
  update:  (pid, rid, d) => api.put(`/projects/${pid}/resources/${rid}`, d).then(r => r.data),
  remove:  (pid, rid)    => api.delete(`/projects/${pid}/resources/${rid}`).then(r => r.data),
  reorder: (pid, items)  => api.put(`/projects/${pid}/resources/reorder`, { items }).then(r => r.data),
}
