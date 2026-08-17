import { AsyncLocalStorage } from "node:async_hooks";

export const tenantScopeStorage = new AsyncLocalStorage();

export function getActiveTenantScope() {
  return tenantScopeStorage.getStore() || null;
}

export function getTenantOwnershipFilter() {
  const scope = getActiveTenantScope();
  if (!scope || !scope.authenticated || scope.isPlatformOwner) return {};
  return scope.companyId ? { companyId: scope.companyId } : { companyId: null };
}

export function tenantScopedSchema(schema) {
  const ownershipFilter = function () {
    const filter = getTenantOwnershipFilter();
    if (Object.keys(filter).length > 0) this.where(filter);
  };

  schema.pre("find", ownershipFilter);
  schema.pre("findOne", ownershipFilter);
  schema.pre("findOneAndUpdate", ownershipFilter);
  schema.pre("findOneAndDelete", ownershipFilter);
  schema.pre("updateMany", ownershipFilter);
  schema.pre("updateOne", ownershipFilter);
  schema.pre("deleteMany", ownershipFilter);
  schema.pre("deleteOne", ownershipFilter);
  schema.pre("countDocuments", ownershipFilter);

  schema.pre("aggregate", function () {
    const filter = getTenantOwnershipFilter();
    if (Object.keys(filter).length > 0) this.pipeline().unshift({ $match: filter });
  });

  schema.pre("save", async function () {
    const scope = getActiveTenantScope();
    const isPlatformOwnerDoc = this.role === "platform-owner";
    const isPlatformOwnerScope = scope?.isPlatformOwner || isPlatformOwnerDoc;

    if (scope?.authenticated && !isPlatformOwnerScope) {
      const effectiveCompanyId = scope.companyId || this.companyId;
      if (!effectiveCompanyId) {
        throw new Error("Tenant context is required");
      }
      if (this.companyId && this.companyId.toString() !== effectiveCompanyId.toString()) {
        throw new Error("Document belongs to another company");
      }
      this.companyId = effectiveCompanyId;
      if (scope) scope.companyId = effectiveCompanyId;
    }
  });
}