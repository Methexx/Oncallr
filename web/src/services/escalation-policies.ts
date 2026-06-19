import { apiClient } from "@/lib/api-client";
import { EscalationPolicy, EscalationPolicyStep } from "@/types/escalation-policy";

interface EscalationPoliciesResponse {
  policies: EscalationPolicy[];
}

interface EscalationPolicyResponse {
  policy: EscalationPolicy;
}

interface SaveEscalationPolicyInput {
  serviceId: string;
  timeoutMinutes: number;
  steps: EscalationPolicyStep[];
}

export async function getEscalationPolicies() {
  const { data } = await apiClient.get<EscalationPoliciesResponse>(
    "/escalation-policies"
  );
  return data.policies;
}

export async function saveEscalationPolicy(input: SaveEscalationPolicyInput) {
  const { data } = await apiClient.post<EscalationPolicyResponse>(
    "/escalation-policies",
    input
  );
  return data.policy;
}
