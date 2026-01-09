#!/usr/bin/env python3
"""
Unified Pipeline Loader Tests - 統一管線載入器測試

Tests for 00-namespaces/namespaces-mcp/tools/load_unified_pipeline.py

測試範圍：
1. Manifest loading and parsing
2. InstantPipeline human intervention validation
3. Latency compliance validation
4. Parallelism validation
5. INSTANT mode detection
"""

import pytest
import sys
from pathlib import Path
from dataclasses import dataclass

# Add namespaces-mcp/tools to path
project_root = Path(__file__).parent.parent
repo_root = project_root.parent
sys.path.insert(0, str(repo_root / '00-namespaces' / 'namespaces-mcp' / 'tools'))

# Override MANIFEST_PATH for tests running from workspace directory
WORKSPACE_MANIFEST_PATH = repo_root / '00-namespaces' / 'namespaces-mcp' / 'pipelines' / 'unified-pipeline-config.yaml'

from load_unified_pipeline import (
    InstantExecutionStandards,
    InstantPipeline,
    InstantPipelineStage,
    LatencyThresholds,
    CoreScheduling,
    PipelineMetadata,
    PipelineLabels,
    UnifiedPipelineManifest,
    UnifiedPipelineSpec,
    InputUnification,
    McpIntegration,
    ToolAdapter,
    Outputs,
    is_instant_mode,
    has_zero_human_intervention,
    validate_latency_compliance,
    validate_parallelism,
    load_manifest,
    MANIFEST_PATH,
)


# ============================================================================
# InstantExecutionStandards Tests
# ============================================================================

class TestInstantExecutionStandards:
    """Test INSTANT execution standard constants."""

    def test_latency_thresholds_are_defined(self):
        """Verify all required latency constants are defined."""
        assert InstantExecutionStandards.MAX_LATENCY_INSTANT == 100
        assert InstantExecutionStandards.MAX_LATENCY_FAST == 500
        assert InstantExecutionStandards.MAX_LATENCY_STANDARD == 5000
        assert InstantExecutionStandards.MAX_STAGE_LATENCY == 30000
        assert InstantExecutionStandards.MAX_TOTAL_LATENCY == 180000

    def test_parallelism_constants(self):
        """Verify parallelism constants."""
        assert InstantExecutionStandards.MIN_PARALLEL_AGENTS == 64
        assert InstantExecutionStandards.MAX_PARALLEL_AGENTS == 256

    def test_human_intervention_is_zero(self):
        """Verify human intervention must be zero."""
        assert InstantExecutionStandards.HUMAN_INTERVENTION == 0


# ============================================================================
# InstantPipeline Human Intervention Tests
# ============================================================================

class TestInstantPipelineHumanIntervention:
    """Test InstantPipeline enforces zero human intervention."""

    def test_valid_instant_pipeline_with_zero_intervention(self):
        """InstantPipeline should accept humanIntervention=0."""
        stages = [
            InstantPipelineStage(name="test", agent="analyzer", latency=5000, parallelism=1)
        ]
        pipeline = InstantPipeline(
            name="test-pipeline",
            totalLatencyTarget=60000,
            humanIntervention=0,
            successRateTarget=95.0,
            stages=stages,
        )
        assert pipeline.humanIntervention == 0

    def test_instant_pipeline_rejects_nonzero_intervention(self):
        """InstantPipeline should reject humanIntervention != 0."""
        stages = [
            InstantPipelineStage(name="test", agent="analyzer", latency=5000, parallelism=1)
        ]
        with pytest.raises(ValueError, match="humanIntervention must be 0"):
            InstantPipeline(
                name="test-pipeline",
                totalLatencyTarget=60000,
                humanIntervention=1,  # type: ignore  # Intentionally invalid
                successRateTarget=95.0,
                stages=stages,
            )


# ============================================================================
# Latency Compliance Tests
# ============================================================================

class TestLatencyCompliance:
    """Test latency compliance validation."""

    def _create_manifest_with_thresholds(
        self,
        instant: int = 100,
        fast: int = 500,
        standard: int = 5000,
        maxStage: int = 30000,
        maxTotal: int = 180000,
    ) -> UnifiedPipelineManifest:
        """Helper to create a manifest with specific latency thresholds."""
        return UnifiedPipelineManifest(
            apiVersion="pipeline.machinenativeops/v3",
            kind="UnifiedPipeline",
            metadata=PipelineMetadata(
                name="test",
                version="1.0.0",
                mode="INSTANT-Autonomous",
            ),
            spec=UnifiedPipelineSpec(
                inputUnification=InputUnification(
                    protocols=["webhook"],
                    normalization="canonical",
                    validation="strict",
                    timeout=5000,
                ),
                coreScheduling=CoreScheduling(
                    maxParallelAgents=256,
                    taskDecomposition="ai_optimized",
                    resourceArbitration="quantum",
                    loadBalancing="adaptive",
                    syncBarrier="enabled",
                ),
                latencyThresholds=LatencyThresholds(
                    instant=instant,
                    fast=fast,
                    standard=standard,
                    maxStage=maxStage,
                    maxTotal=maxTotal,
                ),
                pipelines=[],
                mcpIntegration=McpIntegration(
                    serverRef="workspace/mcp",
                    toolAdapters=[],
                    realTimeSync="enabled",
                ),
                outputs=Outputs(
                    auditLog="unified",
                    evidenceChain="aggregated",
                    statusReport="generated",
                    autoRemediation="enabled",
                    notifications="multi_platform",
                ),
            ),
        )

    def test_compliant_latency_thresholds(self):
        """Latency thresholds at or below standards should pass."""
        manifest = self._create_manifest_with_thresholds(
            instant=100,
            fast=500,
            standard=5000,
            maxStage=30000,
            maxTotal=180000,
        )
        assert validate_latency_compliance(manifest) is True

    def test_stricter_latency_thresholds_pass(self):
        """Stricter latency thresholds (below standards) should pass."""
        manifest = self._create_manifest_with_thresholds(
            instant=50,
            fast=250,
            standard=2500,
            maxStage=15000,
            maxTotal=90000,
        )
        assert validate_latency_compliance(manifest) is True

    def test_instant_latency_too_high_fails(self):
        """Instant latency above standard should fail."""
        manifest = self._create_manifest_with_thresholds(instant=150)
        assert validate_latency_compliance(manifest) is False

    def test_total_latency_too_high_fails(self):
        """Total latency above 3 minutes should fail."""
        manifest = self._create_manifest_with_thresholds(maxTotal=200000)
        assert validate_latency_compliance(manifest) is False

    def test_no_thresholds_returns_true(self):
        """Manifest without latency thresholds should pass."""
        manifest = self._create_manifest_with_thresholds()
        manifest.spec.latencyThresholds = None
        assert validate_latency_compliance(manifest) is True


# ============================================================================
# Parallelism Validation Tests
# ============================================================================

class TestParallelismValidation:
    """Test parallelism boundary validation."""

    def _create_manifest_with_parallelism(
        self,
        mode: str = "INSTANT-Autonomous",
        maxParallelAgents: int = 128,
        minParallelAgents: int = 64,
    ) -> UnifiedPipelineManifest:
        """Helper to create a manifest with specific parallelism settings."""
        return UnifiedPipelineManifest(
            apiVersion="pipeline.machinenativeops/v3",
            kind="UnifiedPipeline",
            metadata=PipelineMetadata(
                name="test",
                version="1.0.0",
                mode=mode,
            ),
            spec=UnifiedPipelineSpec(
                inputUnification=InputUnification(
                    protocols=["webhook"],
                    normalization="canonical",
                    validation="strict",
                    timeout=5000,
                ),
                coreScheduling=CoreScheduling(
                    maxParallelAgents=maxParallelAgents,
                    minParallelAgents=minParallelAgents,
                    taskDecomposition="ai_optimized",
                    resourceArbitration="quantum",
                    loadBalancing="adaptive",
                    syncBarrier="enabled",
                ),
                pipelines=[],
                mcpIntegration=McpIntegration(
                    serverRef="workspace/mcp",
                    toolAdapters=[],
                    realTimeSync="enabled",
                ),
                outputs=Outputs(
                    auditLog="unified",
                    evidenceChain="aggregated",
                    statusReport="generated",
                    autoRemediation="enabled",
                    notifications="multi_platform",
                ),
            ),
        )

    def test_valid_parallelism_within_range(self):
        """Parallelism within 64-256 should pass."""
        manifest = self._create_manifest_with_parallelism(
            maxParallelAgents=128,
            minParallelAgents=64,
        )
        assert validate_parallelism(manifest) is True

    def test_max_parallelism_at_upper_bound(self):
        """Max parallelism at 256 should pass."""
        manifest = self._create_manifest_with_parallelism(
            maxParallelAgents=256,
            minParallelAgents=64,
        )
        assert validate_parallelism(manifest) is True

    def test_max_parallelism_above_limit_fails(self):
        """Max parallelism above 256 should fail."""
        manifest = self._create_manifest_with_parallelism(
            maxParallelAgents=300,
            minParallelAgents=64,
        )
        assert validate_parallelism(manifest) is False

    def test_max_parallelism_below_minimum_fails(self):
        """Max parallelism below 64 should fail."""
        manifest = self._create_manifest_with_parallelism(
            maxParallelAgents=32,
            minParallelAgents=16,
        )
        assert validate_parallelism(manifest) is False

    def test_min_parallelism_below_standard_in_instant_mode_fails(self):
        """Min parallelism below 64 in INSTANT mode should fail."""
        manifest = self._create_manifest_with_parallelism(
            mode="INSTANT-Autonomous",
            maxParallelAgents=128,
            minParallelAgents=32,
        )
        assert validate_parallelism(manifest) is False


# ============================================================================
# Mode Detection Tests
# ============================================================================

class TestModeDetection:
    """Test INSTANT mode and human intervention detection."""

    def _create_manifest(
        self,
        mode: str = "INSTANT-Autonomous",
        humanIntervention: str = "0",
    ) -> UnifiedPipelineManifest:
        """Helper to create a manifest with specific mode settings."""
        return UnifiedPipelineManifest(
            apiVersion="pipeline.machinenativeops/v3",
            kind="UnifiedPipeline",
            metadata=PipelineMetadata(
                name="test",
                version="1.0.0",
                mode=mode,
                labels=PipelineLabels(humanIntervention=humanIntervention),
            ),
            spec=UnifiedPipelineSpec(
                inputUnification=InputUnification(
                    protocols=["webhook"],
                    normalization="canonical",
                    validation="strict",
                    timeout=5000,
                ),
                coreScheduling=CoreScheduling(
                    maxParallelAgents=128,
                    taskDecomposition="ai_optimized",
                    resourceArbitration="quantum",
                    loadBalancing="adaptive",
                    syncBarrier="enabled",
                ),
                pipelines=[],
                mcpIntegration=McpIntegration(
                    serverRef="workspace/mcp",
                    toolAdapters=[],
                    realTimeSync="enabled",
                ),
                outputs=Outputs(
                    auditLog="unified",
                    evidenceChain="aggregated",
                    statusReport="generated",
                    autoRemediation="enabled",
                    notifications="multi_platform",
                ),
            ),
        )

    def test_instant_mode_detection(self):
        """INSTANT-Autonomous mode should be detected."""
        manifest = self._create_manifest(mode="INSTANT-Autonomous")
        assert is_instant_mode(manifest) is True

    def test_non_instant_mode_detection(self):
        """Non-INSTANT modes should not be detected as INSTANT."""
        manifest = self._create_manifest(mode="Standard")
        assert is_instant_mode(manifest) is False

    def test_zero_human_intervention_detection(self):
        """Human intervention '0' should be detected."""
        manifest = self._create_manifest(humanIntervention="0")
        assert has_zero_human_intervention(manifest) is True

    def test_nonzero_human_intervention_detection(self):
        """Non-zero human intervention should be detected."""
        manifest = self._create_manifest(humanIntervention="1")
        assert has_zero_human_intervention(manifest) is False


# ============================================================================
# Manifest Loading Integration Test
# ============================================================================

class TestManifestLoading:
    """Test loading the actual pipeline manifest."""

    def test_load_actual_manifest(self):
        """Test loading the actual unified pipeline config."""
        # Skip if manifest doesn't exist
        if not WORKSPACE_MANIFEST_PATH.exists():
            pytest.skip(f"Manifest not found at {WORKSPACE_MANIFEST_PATH}")

        manifest = load_manifest(WORKSPACE_MANIFEST_PATH)

        # Verify basic structure
        assert manifest.apiVersion == "pipeline.machinenativeops/v3"
        assert manifest.kind == "UnifiedPipeline"
        assert manifest.metadata is not None
        assert manifest.spec is not None

    def test_loaded_manifest_is_instant_mode(self):
        """Verify the loaded manifest is in INSTANT mode."""
        if not WORKSPACE_MANIFEST_PATH.exists():
            pytest.skip(f"Manifest not found at {WORKSPACE_MANIFEST_PATH}")

        manifest = load_manifest(WORKSPACE_MANIFEST_PATH)
        assert is_instant_mode(manifest) is True

    def test_loaded_manifest_has_zero_intervention(self):
        """Verify the loaded manifest has zero human intervention."""
        if not WORKSPACE_MANIFEST_PATH.exists():
            pytest.skip(f"Manifest not found at {WORKSPACE_MANIFEST_PATH}")

        manifest = load_manifest(WORKSPACE_MANIFEST_PATH)
        assert has_zero_human_intervention(manifest) is True

    def test_loaded_manifest_latency_compliance(self):
        """Verify the loaded manifest meets latency standards."""
        if not WORKSPACE_MANIFEST_PATH.exists():
            pytest.skip(f"Manifest not found at {WORKSPACE_MANIFEST_PATH}")

        manifest = load_manifest(WORKSPACE_MANIFEST_PATH)
        assert validate_latency_compliance(manifest) is True

    def test_loaded_manifest_parallelism_compliance(self):
        """Verify the loaded manifest meets parallelism standards."""
        if not WORKSPACE_MANIFEST_PATH.exists():
            pytest.skip(f"Manifest not found at {WORKSPACE_MANIFEST_PATH}")

        manifest = load_manifest(WORKSPACE_MANIFEST_PATH)
        assert validate_parallelism(manifest) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
