// Canonical IDs remain authoritative; codes support existing saved declarations.
export function categoryDeviceTypes(types: any[], config: any) {
  const references: string[] = config?.compatibility_rules?._eligible_type_ids ?? config?.eligible_device_types ?? []
  const allowed = new Set(references)
  return types.filter(type => allowed.has(type.id) || allowed.has(type.code))
}

export function declaredTypeIds(values: string[], types: any[]) {
  const byReference = new Map<string, string>()
  for (const type of types) {
    byReference.set(type.id, type.id)
    byReference.set(type.code, type.id)
  }
  return [...new Set(values.map(value => byReference.get(value) || value))]
}

export function deviceDisplayName(device: any) {
  const manufacturer = device.manufacturer_name || device.brand || ''
  const name = device.name || ''
  const model = device.model_number || device.model || ''
  return [manufacturer, name, model ? `(${model})` : ''].filter(Boolean).join(' ')
}
