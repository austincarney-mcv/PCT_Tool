import api from './client'

// Factory that creates a CRUD API for a project-scoped register
export function makeRegisterApi(resource) {
  return {
    list:   (pid, params) => api.get(`/projects/${pid}/${resource}`, { params }).then(r => r.data),
    create: (pid, d)     => api.post(`/projects/${pid}/${resource}`, d).then(r => r.data),
    update: (pid, id, d) => api.put(`/projects/${pid}/${resource}/${id}`, d).then(r => r.data),
    remove: (pid, id)    => api.delete(`/projects/${pid}/${resource}/${id}`).then(r => r.data),
  }
}

export const approvalsApi      = makeRegisterApi('approvals')
export const criticalItemsApi  = makeRegisterApi('critical-items')
export const designChangesApi  = makeRegisterApi('design-changes')
export const risksApi          = makeRegisterApi('risks')
export const rfisApi           = makeRegisterApi('rfis')
export const lessonsApi        = makeRegisterApi('lessons')
export const sidApi            = makeRegisterApi('sid')
export const valueLogApi       = makeRegisterApi('value-log')
export const briefComplianceApi = makeRegisterApi('brief-compliance')

// Special endpoints
export const approvalsToggle    = (pid, id) => api.patch(`/projects/${pid}/approvals/${id}/complete`).then(r => r.data)
export const criticalItemToggle = (pid, id) => api.patch(`/projects/${pid}/critical-items/${id}/status`).then(r => r.data)
export const designChangeFeeSummary = pid   => api.get(`/projects/${pid}/design-changes/fee-summary`).then(r => r.data)

export const excelApi = {
  exportUrl: pid => `/api/projects/${pid}/export`,
  import:    (pid, formData) => api.post(`/projects/${pid}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
}
