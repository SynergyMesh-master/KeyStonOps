import type { BaselinePack, BaselineCheck, BaselineChange, BaselineVerification } from "../../shared/types";

export const githubSecurityBaselineV1: BaselinePack = {
  id: "github.security_baseline@v1",
  name: "GitHub Repository Security Baseline",
  version: "1.0.0",
  provider: "github",
  description: "Comprehensive security baseline for GitHub repositories including branch protection, vulnerability alerts, and secret scanning.",
  requiredAuthLevel: "WRITE_LOW",
  riskLevel: "LOW",
  rollbackability: "YES",

  checks: [
    {
      id: "check_branch_protection",
      name: "Branch Protection Status",
      description: "Check if branch protection is enabled on the default branch",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        protected: true,
      },
    },
    {
      id: "check_required_reviews",
      name: "Required PR Reviews",
      description: "Check if pull request reviews are required",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        requiredPullRequestReviews: {
          requiredApprovingReviewCount: { $gte: 1 },
        },
      },
    },
    {
      id: "check_force_push_disabled",
      name: "Force Push Disabled",
      description: "Verify force push is disabled on protected branches",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        allowForcePushes: false,
      },
    },
    {
      id: "check_deletions_disabled",
      name: "Branch Deletion Disabled",
      description: "Verify branch deletion is disabled",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        allowDeletions: false,
      },
    },
    {
      id: "check_vulnerability_alerts",
      name: "Vulnerability Alerts",
      description: "Check if vulnerability alerts are enabled",
      action: "github.repo.get_vulnerability_alerts_status",
      expectedResult: {
        enabled: true,
      },
    },
    {
      id: "check_secret_scanning",
      name: "Secret Scanning",
      description: "Check if secret scanning is enabled",
      action: "github.repo.get_secret_scanning_status",
      expectedResult: {
        enabled: true,
      },
    },
  ],

  changes: [
    {
      id: "enable_branch_protection",
      name: "Enable Branch Protection",
      description: "Enable branch protection on the default branch with required reviews",
      action: "github.repo.set_branch_protection",
      params: {
        required_status_checks: null,
        enforce_admins: true,
        required_pull_request_reviews: {
          dismiss_stale_reviews: true,
          require_code_owner_reviews: false,
          required_approving_review_count: 1,
        },
        restrictions: null,
        required_linear_history: false,
        allow_force_pushes: false,
        allow_deletions: false,
        block_creations: false,
        required_conversation_resolution: true,
      },
      rollbackAction: "github.repo.set_branch_protection",
    },
    {
      id: "enable_vulnerability_alerts",
      name: "Enable Vulnerability Alerts",
      description: "Enable Dependabot vulnerability alerts",
      action: "github.repo.enable_vulnerability_alerts",
      params: {},
      rollbackAction: "github.repo.disable_vulnerability_alerts",
    },
    {
      id: "enable_automated_security_fixes",
      name: "Enable Automated Security Fixes",
      description: "Enable Dependabot automated security fixes",
      action: "github.repo.enable_automated_security_fixes",
      params: {},
      rollbackAction: "github.repo.disable_automated_security_fixes",
    },
  ],

  verification: [
    {
      id: "verify_branch_protection",
      name: "Verify Branch Protection",
      description: "Confirm branch protection is properly configured",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        protected: true,
        allowForcePushes: false,
        allowDeletions: false,
      },
    },
    {
      id: "verify_reviews_required",
      name: "Verify Reviews Required",
      description: "Confirm PR reviews are required",
      action: "github.repo.get_branch_protection",
      expectedResult: {
        requiredPullRequestReviews: {
          requiredApprovingReviewCount: { $gte: 1 },
        },
      },
    },
    {
      id: "verify_vulnerability_alerts",
      name: "Verify Vulnerability Alerts",
      description: "Confirm vulnerability alerts are enabled",
      action: "github.repo.get_vulnerability_alerts_status",
      expectedResult: {
        enabled: true,
      },
    },
  ],
};

export const baselinePacks: Record<string, BaselinePack> = {
  "github.security_baseline@v1": githubSecurityBaselineV1,
};

export function getBaselinePack(id: string): BaselinePack | undefined {
  return baselinePacks[id];
}

export function listBaselinePacks(): BaselinePack[] {
  return Object.values(baselinePacks);
}

export function getBaselinePacksForProvider(provider: string): BaselinePack[] {
  return Object.values(baselinePacks).filter((pack) => pack.provider === provider);
}
