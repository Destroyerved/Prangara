"""PRANGARA deterministic carbon engine.

Ported unchanged from the PS10 prototype (`prototype/backend/engine`). This is
the source of truth for every carbon and financial number in the platform.

Rules, from PRD sections 3.1 and 29 and from AI_AGENT_PLAYBOOK section 1:

  * No LLM may calculate, adjust or override anything in this package.
  * No caller may recompute a footprint, an abatement or an economic figure
    outside it.
  * Every result carries a low/base/high band and a source.

The only change from the prototype is where reference data is read from
(`engine/paths.py`) and the addition of `engine/version.py` for the audit stamp
the platform persists with each assessment.
"""
from .assess import assess
from .factors import FactorDB, default_db
from .footprint import compute_footprint
from .leaks import detect_leaks, sector_db
from .macc import recommend, intervention_db
from .version import ENGINE_VERSION, reference_versions, version_stamp

__all__ = [
    "assess", "compute_footprint", "detect_leaks", "recommend",
    "FactorDB", "default_db", "sector_db", "intervention_db",
    "ENGINE_VERSION", "reference_versions", "version_stamp",
]
