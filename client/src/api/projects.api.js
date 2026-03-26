import api from './client'

export const projectsApi = {
  list:   ()       => api.get('/projects').then(r => r.data),
  get:    id       => api.get(`/projects/${id}`).then(r => r.data),
  create: data     => api.post('/projects', data).then(r => r.data),
  update: (id, d)  => api.put(`/projects/${id}`, d).then(r => r.data),
  remove: id       => api.delete(`/projects/${id}`).then(r => r.data),
}
