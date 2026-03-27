import api from './client'

export const c2cApi = {
  listSnapshots:    pid       => api.get(`/projects/${pid}/c2c/snapshots`).then(r => r.data),
  getSnapshot:      (pid, sid) => api.get(`/projects/${pid}/c2c/snapshots/${sid}`).then(r => r.data),
  createSnapshot:   (pid, d)   => api.post(`/projects/${pid}/c2c/snapshots`, d).then(r => r.data),
  lockSnapshot:     (pid, sid) => api.put(`/projects/${pid}/c2c/snapshots/${sid}/lock`).then(r => r.data),
  unlockSnapshot:   (pid, sid) => api.put(`/projects/${pid}/c2c/snapshots/${sid}/unlock`).then(r => r.data),
  deleteSnapshot:   (pid, sid) => api.delete(`/projects/${pid}/c2c/snapshots/${sid}`).then(r => r.data),
  trend:            pid        => api.get(`/projects/${pid}/c2c/trend`).then(r => r.data),
  getStageView:     (pid, phase) => api.get(`/projects/${pid}/c2c/stage-view?phase=${phase}`).then(r => r.data),
  getAllocations:   (pid, sid) => api.get(`/projects/${pid}/c2c/snapshots/${sid}/allocations`).then(r => r.data),
  updateAllocations:(pid, sid, items) => api.put(`/projects/${pid}/c2c/snapshots/${sid}/allocations`, { items }).then(r => r.data),
  getFinancials:   (pid, sid) => api.get(`/projects/${pid}/c2c/snapshots/${sid}/financials`).then(r => r.data),
  updateFinancials:(pid, sid, items) => api.put(`/projects/${pid}/c2c/snapshots/${sid}/financials`, { items }).then(r => r.data),
}
