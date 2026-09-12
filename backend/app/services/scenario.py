"""
What-if scenarios. PRD FR-34.

A scenario modifies the *engine input*, then runs the same unmodified engine.
It never adjusts an engine output, and it never overwrites the baseline.

Each modification is a closed, named transformation of the PlantProfile dict.
Anything the engine cannot currently express - a logistics mode shift with no
modal factor in the registry, for instance - is reported in `unsupported`
rather than approximated, because a scenario that silently does nothing is
worse than one that says it cannot.
"""
from __future__ import annotations

import copy
from typing import Any

from engine import default_db

# Material substitution pairs the factor registry actually supports. A
# substitution with no registry entry cannot be modelled and is declared
# unsupported rather than guessed at.
_RECYCLED_EQUIVALENT = {
    "STEEL_PRIMARY": "STEEL_SECONDARY",
    "ALU_PRIMARY": "ALU_SECONDARY",
    "PET_VIRGIN": "PET_RECYCLED",
    "COTTON_CONV": "COTTON_RECYCLED",
    "PAPER_VIRGIN": "PAPER_RECYCLED",
    "GLASS_VIRGIN": "GLASS_CULLET",
    "CEMENT_OPC": "CEMENT_BLENDED",
}


def apply_modifications(plant_profile: dict[str, Any],
                        modifications: list[dict[str, Any]]) -> tuple[dict[str, Any], list[str]]:
    """Return (modified profile, list of modifications that could not be applied)."""
    profile = copy.deepcopy(plant_profile)
    unsupported: list[str] = []
    fdb = default_db()

    for mod in modifications:
        kind = mod.get("kind")
        value = float(mod.get("value") or 0.0)
        target = mod.get("target_key")
        replacement = mod.get("replacement_key")

        if kind == "electricity_efficiency_pct":
            profile["electricity_kwh"] = float(profile.get("electricity_kwh") or 0.0) * (1 - value / 100.0)

        elif kind == "solar_share_pct":
            # Self-generated solar displaces purchased grid units, so the Scope 2
            # activity falls. The engine prices what remains; nothing here
            # calculates an emission.
            profile["electricity_kwh"] = float(profile.get("electricity_kwh") or 0.0) * (1 - value / 100.0)

        elif kind == "output_change_pct":
            # Output alone changes intensity, not absolute emissions, unless the
            # user also changes activity. Applied to output only, on purpose.
            profile["annual_output_t"] = float(profile.get("annual_output_t") or 0.0) * (1 + value / 100.0)

        elif kind == "recycled_material_pct":
            substitute = replacement or _RECYCLED_EQUIVALENT.get(target or "")
            materials = dict(profile.get("materials") or {})
            if not target or target not in materials:
                unsupported.append(f"recycled_material_pct: '{target}' is not a purchased material")
                continue
            if not substitute or not fdb.has(substitute):
                unsupported.append(
                    f"recycled_material_pct: no recycled equivalent in the factor registry for '{target}'"
                )
                continue
            moved = materials[target] * (value / 100.0)
            materials[target] -= moved
            materials[substitute] = materials.get(substitute, 0.0) + moved
            profile["materials"] = materials

        elif kind == "fuel_switch":
            fuels = dict(profile.get("fuels") or {})
            if not target or target not in fuels:
                unsupported.append(f"fuel_switch: '{target}' is not a fuel this plant burns")
                continue
            if not replacement or not fdb.has(replacement):
                unsupported.append(f"fuel_switch: unknown replacement fuel '{replacement}'")
                continue
            from engine.constants import NCV_GJ

            ncv_from, ncv_to = NCV_GJ.get(target), NCV_GJ.get(replacement)
            if not ncv_from or not ncv_to:
                unsupported.append(
                    f"fuel_switch: no net calorific value for '{target}' or '{replacement}', "
                    "so an equal-energy swap cannot be modelled"
                )
                continue
            # Equal energy, not equal mass. Swapping tonne for tonne between
            # fuels of different calorific value silently changes how much heat
            # the plant makes.
            moved_qty = fuels[target] * (value / 100.0)
            energy = moved_qty * ncv_from
            fuels[target] -= moved_qty
            fuels[replacement] = fuels.get(replacement, 0.0) + energy / ncv_to
            profile["fuels"] = fuels

        elif kind == "waste_recovery_pct":
            waste = dict(profile.get("waste") or {})
            if not waste:
                unsupported.append("waste_recovery_pct: no waste streams recorded")
                continue
            keys = [target] if target and target in waste else list(waste)
            for key in keys:
                waste[key] = waste[key] * (1 - value / 100.0)
            profile["waste"] = waste

        elif kind == "logistics_mode_shift_pct":
            freight = dict(profile.get("freight") or {})
            if not target or target not in freight:
                unsupported.append(f"logistics_mode_shift_pct: '{target}' is not a freight mode in use")
                continue
            if not replacement or not fdb.has(replacement):
                unsupported.append(
                    f"logistics_mode_shift_pct: unknown replacement mode '{replacement}'"
                )
                continue
            moved = freight[target] * (value / 100.0)
            freight[target] -= moved
            freight[replacement] = freight.get(replacement, 0.0) + moved
            profile["freight"] = freight

        else:
            unsupported.append(f"unknown modification kind '{kind}'")

    return profile, unsupported
